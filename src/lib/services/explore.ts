import { db } from "../db";
import { canonicalKeyFor } from "../canonical";
import { categoryMeta } from "../categories";
import { publicUserSelect, toPublicUser, toTimelineEntry } from "../mappers";
import { itemVisibleWhere } from "../visibility";
import type { PublicUser, TimelineEntry } from "../dto";
import { decorateEntries, ownedCopiesForKey } from "./explore-helpers";
import { savedIdsFor } from "./saves";

/**
 * Explore: item-focused discovery. Public items are grouped by canonicalKey ("the same thing") and ranked by
 * how many different people own it, plus recent adds, recent likes and views. "For you" narrows it to the
 * categories and tags of the viewer's own collections; signed-out / empty accounts get global trending.
 * Results are cached briefly per instance to keep free-tier Postgres usage low.
 */

export const EXPLORE_PAGE_SIZE = 24;
export const EXPLORE_POSTS_PAGE_SIZE = 8;

const TTL = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "test") return fn();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

let keysCheckedAt = 0;
/** Give older rows a grouping key (bulk, at most every few minutes). */
export async function ensureCanonicalKeys(force = false) {
  if (!force && Date.now() - keysCheckedAt < 5 * 60_000) return 0;
  keysCheckedAt = Date.now();
  let total = 0;
  for (let round = 0; round < 5; round++) {
    const rows = await db.item.findMany({ where: { canonicalKey: null }, select: { id: true, type: true, url: true, title: true }, take: 500 });
    if (rows.length === 0) break;
    const pairs = rows.map((r) => [r.id, canonicalKeyFor(r) ?? `x${r.id}`.slice(0, 20)] as const);
    await db.$executeRawUnsafe(
      `UPDATE "Item" i SET "canonicalKey" = v.k FROM unnest($1::text[], $2::text[]) AS v(id, k) WHERE i.id = v.id`,
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
    );
    total += rows.length;
    if (rows.length < 500) break;
  }
  return total;
}

export interface ExploreCard {
  key: string;
  itemId: string;
  title: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  type: "LINK" | "PHOTO";
  imageWidth: number | null;
  imageHeight: number | null;
  category: string;
  owners: number;
  likes: number;
  ownerPreview: PublicUser[];
  mine: boolean;
  /** The representative post is on the viewer's private Want list (signed-in viewers only). */
  savedByMe?: boolean;
}

/** Categories and tags of the viewer's collections, most-used first. */
export async function viewerInterests(viewerId: string) {
  const [cats, tags] = await Promise.all([
    db.$queryRawUnsafe<Array<{ category: string; n: number }>>(
      `SELECT s.category, count(i.id)::int AS n FROM "Shelf" s JOIN "Page" p ON p.id = s."pageId" LEFT JOIN "Item" i ON i."shelfId" = s.id
       WHERE p."userId" = $1 GROUP BY s.category ORDER BY n DESC, s.category ASC LIMIT 12`,
      viewerId,
    ),
    db.$queryRawUnsafe<Array<{ tag: string }>>(
      `SELECT t AS tag FROM "Item" i, unnest(i.tags) t WHERE i."userId" = $1 GROUP BY t ORDER BY count(*) DESC LIMIT 20`,
      viewerId,
    ),
  ]);
  return { categories: cats.map((c) => c.category).filter((c) => c !== "other"), tags: tags.map((t) => t.tag) };
}

async function globalCategories() {
  return cached("explore:cats", async () => {
    const rows = await db.$queryRawUnsafe<Array<{ category: string }>>(
      `SELECT s.category FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
       WHERE i.visibility = 'public' AND s.visibility = 'public' AND p.visibility = 'public' AND s.category <> 'other'
       GROUP BY s.category ORDER BY count(DISTINCT i."userId") DESC, count(*) DESC LIMIT 10`,
    );
    return rows.map((r) => r.category);
  });
}

export interface ExploreChip {
  id: string;
  label: string;
}

/** Chips across the top: "For you" (or "Trending") first, then the viewer's categories (or popular ones). */
export async function exploreChips(viewerId?: string | null): Promise<{ chips: ExploreChip[]; personal: boolean }> {
  const mine = viewerId ? (await viewerInterests(viewerId)).categories : [];
  const personal = mine.length > 0;
  const ids = personal ? mine : await globalCategories();
  return {
    personal,
    chips: [{ id: personal ? "for-you" : "trending", label: personal ? "For you" : "Trending" }, ...ids.map((id) => ({ id, label: categoryMeta(id).label }))],
  };
}

const PUBLIC = `i.visibility = 'public' AND s.visibility = 'public' AND p.visibility = 'public'`;

async function rankKeys(filter: { categories: string[] | null; tags: string[] }, limit: number, offset: number) {
  return db.$queryRawUnsafe<Array<{ k: string; owners: number; likes: number; score: number }>>(
    `
    WITH pub AS (
      SELECT i.id, i."canonicalKey" AS k, i."userId", i."createdAt", i."viewCount", i.tags, s.category
      FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
      WHERE ${PUBLIC} AND i."canonicalKey" IS NOT NULL
    ),
    matched AS (
      SELECT DISTINCT k FROM pub
      WHERE $1::text[] IS NULL OR pub.category = ANY($1::text[]) OR (cardinality($2::text[]) > 0 AND pub.tags && $2::text[])
    ),
    g AS (
      SELECT pub.k, count(DISTINCT pub."userId")::int AS owners,
             count(*) FILTER (WHERE pub."createdAt" > now() - interval '14 days')::int AS recent,
             coalesce(sum(pub."viewCount"), 0)::int AS views, max(pub."createdAt") AS last
      FROM pub JOIN matched USING (k) GROUP BY pub.k
    ),
    lk AS (
      SELECT pub.k, count(*)::int AS likes FROM "ItemLike" l JOIN pub ON pub.id = l."itemId"
      WHERE l."createdAt" > now() - interval '30 days' AND pub.k IN (SELECT k FROM matched) GROUP BY pub.k
    )
    SELECT g.k, g.owners, coalesce(lk.likes, 0)::int AS likes,
           (g.owners * 6 + g.recent * 2 + coalesce(lk.likes, 0) * 1.5 + g.views * 0.15)::float AS score
    FROM g LEFT JOIN lk USING (k)
    ORDER BY score DESC, g.last DESC, g.k ASC
    LIMIT $3 OFFSET $4
    `,
    filter.categories,
    filter.tags,
    limit,
    offset,
  );
}

/** One representative post per key (oldest original with a photo) and a few owners' avatars. */
async function cardsFor(ranked: Array<{ k: string; owners: number; likes: number }>, viewerId?: string | null): Promise<ExploreCard[]> {
  if (ranked.length === 0) return [];
  const keys = ranked.map((r) => r.k);
  const [reps, people, mine] = await Promise.all([
    db.$queryRawUnsafe<Array<{ k: string; id: string; title: string; imageUrl: string | null; faviconUrl: string | null; siteName: string | null; type: string; imageWidth: number | null; imageHeight: number | null; category: string }>>(
      `SELECT DISTINCT ON (i."canonicalKey") i."canonicalKey" AS k, i.id, i.title, i."imageUrl", i."faviconUrl", i."siteName", i.type, i."imageWidth", i."imageHeight", s.category
       FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
       WHERE ${PUBLIC} AND i."canonicalKey" = ANY($1::text[])
       ORDER BY i."canonicalKey", (i."imageUrl" IS NULL), (i."sourceItemId" IS NOT NULL), i."createdAt" ASC`,
      keys,
    ),
    db.$queryRawUnsafe<Array<{ k: string; id: string; username: string; displayName: string; bio: string; avatarUrl: string | null; subscribed: boolean }>>(
      `SELECT k, id, username, "displayName", bio, "avatarUrl", subscribed FROM (
         SELECT x.k, u.id, u.username, u."displayName", u.bio, u."avatarUrl", u.subscribed, row_number() OVER (PARTITION BY x.k ORDER BY x.at DESC) AS rn
         FROM (SELECT i."canonicalKey" AS k, i."userId", max(i."createdAt") AS at
               FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
               WHERE ${PUBLIC} AND i."canonicalKey" = ANY($1::text[]) GROUP BY i."canonicalKey", i."userId") x
         JOIN "User" u ON u.id = x."userId"
       ) t WHERE rn <= 3`,
      keys,
    ),
    viewerId ? db.item.findMany({ where: { userId: viewerId, canonicalKey: { in: keys } }, select: { canonicalKey: true } }) : Promise.resolve([]),
  ]);
  const repBy = new Map(reps.map((r) => [r.k, r]));
  const mineSet = new Set(mine.map((m) => m.canonicalKey));
  const saved = await savedIdsFor(viewerId, reps.map((r) => r.id));
  return ranked.flatMap((r) => {
    const rep = repBy.get(r.k);
    if (!rep) return [];
    return [
      {
        key: r.k,
        itemId: rep.id,
        title: rep.title,
        imageUrl: rep.imageUrl,
        faviconUrl: rep.faviconUrl,
        siteName: rep.siteName,
        type: rep.type === "PHOTO" ? "PHOTO" : "LINK",
        imageWidth: rep.imageWidth,
        imageHeight: rep.imageHeight,
        category: rep.category,
        owners: r.owners,
        likes: r.likes,
        ownerPreview: people.filter((p) => p.k === r.k).map((p) => toPublicUser(p)),
        mine: mineSet.has(r.k),
        ...(viewerId ? { savedByMe: saved.has(rep.id) } : {}),
      } satisfies ExploreCard,
    ];
  });
}

/**
 * A page of Explore cards. `chip` is "for-you", "trending" or a category id.
 * "For you" with too little personal signal tops up from global trending (flagged `fallback`).
 */
export async function exploreItems(opts: { viewerId?: string | null; chip?: string; offset?: number; limit?: number }) {
  await ensureCanonicalKeys();
  const limit = Math.min(opts.limit ?? EXPLORE_PAGE_SIZE, 48);
  const offset = Math.max(0, opts.offset ?? 0);
  const chip = opts.chip ?? "for-you";
  let filter: { categories: string[] | null; tags: string[] } = { categories: null, tags: [] };
  let personal = false;
  if (chip === "for-you" && opts.viewerId) {
    const mine = await viewerInterests(opts.viewerId);
    if (mine.categories.length || mine.tags.length) {
      filter = { categories: mine.categories, tags: mine.tags };
      personal = true;
    }
  } else if (chip !== "for-you" && chip !== "trending") {
    filter = { categories: [chip], tags: [] };
  }
  const cacheKey = `explore:${JSON.stringify(filter)}:${limit}:${offset}`;
  let ranked = await cached(cacheKey, () => rankKeys(filter, limit + 1, offset));
  let fallback = false;
  if (personal && offset === 0 && ranked.length < 6) {
    const global = await cached(`explore:global:${limit}`, () => rankKeys({ categories: null, tags: [] }, limit + 1, 0));
    const seen = new Set(ranked.map((r) => r.k));
    ranked = [...ranked, ...global.filter((g) => !seen.has(g.k))];
    fallback = true;
  }
  const hasMore = ranked.length > limit && !fallback;
  const items = await cardsFor(ranked.slice(0, limit), opts.viewerId);
  return { items, nextOffset: hasMore ? offset + limit : null, personal, fallback };
}

/** Everything for /explore/item/[key]: the hero, owner count + faces, and posts of it from every owner. */
export async function exploreItem(key: string, viewerId?: string | null) {
  const [ranked] = await db.$queryRawUnsafe<Array<{ k: string; owners: number; likes: number }>>(
    `SELECT i."canonicalKey" AS k, count(DISTINCT i."userId")::int AS owners,
            (SELECT count(*)::int FROM "ItemLike" l JOIN "Item" j ON j.id = l."itemId" WHERE j."canonicalKey" = $1) AS likes
     FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
     WHERE ${PUBLIC} AND i."canonicalKey" = $1 GROUP BY i."canonicalKey"`,
    key,
  );
  if (!ranked) return null;
  const [card] = await cardsFor([ranked], viewerId);
  if (!card) return null;
  const more = await db.$queryRawUnsafe<Array<{ id: string; username: string; displayName: string; bio: string; avatarUrl: string | null; subscribed: boolean }>>(
    `SELECT DISTINCT ON (u.id) u.id, u.username, u."displayName", u.bio, u."avatarUrl", u.subscribed
     FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId" JOIN "User" u ON u.id = i."userId"
     WHERE ${PUBLIC} AND i."canonicalKey" = $1 ORDER BY u.id LIMIT 8`,
    key,
  );
  const collected = viewerId ? await ownedCopiesForKey(viewerId, key) : [];
  return { ...card, ownerPreview: card.ownerPreview.length >= 3 ? card.ownerPreview : more.map((m) => toPublicUser(m)).slice(0, 5), collected };
}

const include = {
  user: { select: publicUserSelect },
  shelf: { include: { page: true } },
} as const;

/** Every visible post of one thing, most-liked first, then newest. Offset-paged. */
export async function exploreItemPosts(key: string, viewerId?: string | null, offset = 0): Promise<{ items: TimelineEntry[]; nextOffset: number | null }> {
  const rows = await db.item.findMany({
    where: { canonicalKey: key, ...itemVisibleWhere(viewerId) },
    include,
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }, { id: "asc" }],
    skip: offset,
    take: EXPLORE_POSTS_PAGE_SIZE + 1,
  });
  const hasMore = rows.length > EXPLORE_POSTS_PAGE_SIZE;
  const items = await decorateEntries(rows.slice(0, EXPLORE_POSTS_PAGE_SIZE).map(toTimelineEntry), viewerId);
  return { items, nextOffset: hasMore ? offset + EXPLORE_POSTS_PAGE_SIZE : null };
}

/** Test hook. */
export const clearExploreCache = () => {
  cache.clear();
  keysCheckedAt = 0;
};
