import { db } from "../db";
import { CATEGORY_GROUPS, CATEGORY_IDS, categoryMeta } from "../categories";
import { publicItemFilter } from "../visibility";
import { isTopicSlug } from "../topics";
import { publicUserPreviewSelect, toPublicUser } from "../mappers";
import type { PublicUser } from "../dto";
import { followStates } from "./connections";
import { savedIdsFor } from "./saves";
import type { FollowState } from "./notifications";

/**
 * Discovery: trending collections, people you might like, and topic pages (one per category).
 * Everything here reads public data only (public item + public collection + public page), never private
 * items, pending requests or Want lists of other people. Results are cached briefly per instance, like Explore.
 */

const TTL = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "test") return fn();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  return value;
}
export const clearDiscoveryCache = () => cache.clear();

/* ------------------------------------------------------------------ Trending collections */

export const TRENDING_WINDOW_DAYS = 7;
/** A signal loses half its weight every this many hours. */
export const TRENDING_HALF_LIFE_HOURS = 48;
/** Saves say "I want this" most strongly; new items keep a collection fresh; follows lift all of an owner's collections a little. */
export const TRENDING_WEIGHTS = { save: 4, like: 3, item: 2, follow: 1 } as const;
export type TrendingSignal = keyof typeof TRENDING_WEIGHTS;

/** Weight of one signal of this age (hours). Signals older than the window count for nothing. */
export function decayedWeight(kind: TrendingSignal, ageHours: number): number {
  if (ageHours < 0) ageHours = 0;
  if (ageHours > TRENDING_WINDOW_DAYS * 24) return 0;
  return TRENDING_WEIGHTS[kind] * Math.exp((-Math.LN2 * ageHours) / TRENDING_HALF_LIFE_HOURS);
}

/** Score of a collection from its recent signals. Mirrors the SQL in rankTrendingShelves. */
export function trendingScore(signals: Array<{ kind: TrendingSignal; ageHours: number }>): number {
  return signals.reduce((sum, s) => sum + decayedWeight(s.kind, s.ageHours), 0);
}

export interface CollectionCover {
  id: string;
  title: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  type: "LINK" | "PHOTO";
}

export interface TrendingCollection {
  id: string;
  name: string;
  category: string;
  pageId: string;
  owner: PublicUser;
  itemCount: number;
  /** Public items added in the last week. */
  newThisWeek: number;
  covers: CollectionCover[];
  score: number;
}

const PUBLIC_SQL = `i.visibility = 'public' AND s.visibility = 'public' AND p.visibility = 'public'`;

/** Shelf ids by decayed signal score over the window (likes/saves from other people, new items, new followers). */
export async function rankTrendingShelves(opts: { category?: string | null; limit: number }) {
  return db.$queryRawUnsafe<Array<{ id: string; userId: string; score: number; fresh: number }>>(
    `
    WITH ps AS (
      SELECT s.id, p."userId" FROM "Shelf" s JOIN "Page" p ON p.id = s."pageId"
      WHERE s.visibility = 'public' AND p.visibility = 'public' AND ($1::text IS NULL OR s.category = $1)
    ),
    ev AS (
      SELECT i."shelfId" AS sid, l."createdAt" AS at, $3::float AS w FROM "ItemLike" l JOIN "Item" i ON i.id = l."itemId"
        WHERE l."createdAt" > now() - make_interval(days => $7::int) AND i.visibility = 'public' AND l."userId" <> i."userId"
      UNION ALL
      SELECT i."shelfId", sv."createdAt", $4::float FROM "SavedItem" sv JOIN "Item" i ON i.id = sv."itemId"
        WHERE sv."createdAt" > now() - make_interval(days => $7::int) AND i.visibility = 'public' AND sv."userId" <> i."userId"
      UNION ALL
      SELECT i."shelfId", i."createdAt", $5::float FROM "Item" i
        WHERE i."createdAt" > now() - make_interval(days => $7::int) AND i.visibility = 'public'
      UNION ALL
      SELECT ps.id, f."createdAt", $6::float FROM "Follow" f JOIN ps ON ps."userId" = f."followingId"
        WHERE f."createdAt" > now() - make_interval(days => $7::int)
    )
    SELECT ps.id, ps."userId",
           sum(ev.w * exp(-ln(2) * GREATEST(0, extract(epoch FROM (now() - ev.at))) / 3600.0 / $8::float))::float AS score,
           count(*) FILTER (WHERE ev.w = $5::float)::int AS fresh
    FROM ev JOIN ps ON ps.id = ev.sid
    WHERE EXISTS (SELECT 1 FROM "Item" i WHERE i."shelfId" = ps.id AND i.visibility = 'public')
    GROUP BY ps.id, ps."userId"
    ORDER BY score DESC, ps.id ASC
    LIMIT $2
    `,
    opts.category ?? null,
    opts.limit,
    TRENDING_WEIGHTS.like,
    TRENDING_WEIGHTS.save,
    TRENDING_WEIGHTS.item,
    TRENDING_WEIGHTS.follow,
    TRENDING_WINDOW_DAYS,
    TRENDING_HALF_LIFE_HOURS,
  );
}

/** All-time fallback for quiet weeks: biggest public collections, most recently active first. */
async function rankPopularShelves(opts: { category?: string | null; limit: number; exclude: string[] }) {
  return db.$queryRawUnsafe<Array<{ id: string; userId: string }>>(
    `SELECT s.id, p."userId" FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
     WHERE ${PUBLIC_SQL} AND ($1::text IS NULL OR s.category = $1) AND NOT (s.id = ANY($3::text[]))
     GROUP BY s.id, p."userId" ORDER BY count(*) DESC, max(i."createdAt") DESC, s.id ASC LIMIT $2`,
    opts.category ?? null,
    opts.limit,
    opts.exclude,
  );
}

async function collectionDetails(ranked: Array<{ id: string; score?: number; fresh?: number }>): Promise<TrendingCollection[]> {
  if (ranked.length === 0) return [];
  const rows = await db.shelf.findMany({
    where: { id: { in: ranked.map((r) => r.id) }, visibility: "public", page: { visibility: "public" } },
    select: {
      id: true,
      name: true,
      category: true,
      pageId: true,
      page: { select: { user: { select: publicUserPreviewSelect } } },
      items: {
        where: { visibility: "public" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 4,
        select: { id: true, title: true, imageUrl: true, faviconUrl: true, siteName: true, type: true },
      },
      _count: { select: { items: { where: { visibility: "public" } } } },
    },
  });
  const by = new Map(rows.map((r) => [r.id, r]));
  return ranked.flatMap((r) => {
    const s = by.get(r.id);
    if (!s || s._count.items === 0) return [];
    return [
      {
        id: s.id,
        name: s.name,
        category: s.category,
        pageId: s.pageId,
        owner: toPublicUser(s.page.user),
        itemCount: s._count.items,
        newThisWeek: r.fresh ?? 0,
        covers: s.items.map((i) => ({ ...i, type: i.type === "PHOTO" ? ("PHOTO" as const) : ("LINK" as const) })),
        score: r.score ?? 0,
      },
    ];
  });
}

/**
 * Trending collections, at most one per owner so a single prolific account can't fill the row.
 * Tops up from all-time popular collections when the week is quiet (`fallback`).
 */
export async function trendingCollections(opts: { category?: string | null; limit?: number } = {}): Promise<{ collections: TrendingCollection[]; fallback: boolean }> {
  const limit = Math.min(opts.limit ?? 10, 24);
  const category = opts.category ?? null;
  return cached(`trending:${category}:${limit}`, async () => {
    const hot = await rankTrendingShelves({ category, limit: limit * 3 });
    const seen = new Set<string>();
    const picked: typeof hot = [];
    for (const r of hot) {
      if (seen.has(r.userId)) continue;
      seen.add(r.userId);
      picked.push(r);
      if (picked.length >= limit) break;
    }
    let fallback = false;
    let ranked: Array<{ id: string; score?: number; fresh?: number }> = picked;
    if (picked.length < Math.min(4, limit)) {
      const more = await rankPopularShelves({ category, limit: limit * 3, exclude: picked.map((p) => p.id) });
      for (const r of more) {
        if (ranked.length >= limit) break;
        if (seen.has(r.userId)) continue;
        seen.add(r.userId);
        ranked = [...ranked, { id: r.id }];
        fallback = true;
      }
    }
    return { collections: await collectionDetails(ranked), fallback };
  });
}

/* ------------------------------------------------------------------ People you might like */

export interface SuggestedCollector {
  user: PublicUser;
  reason: string;
  itemCount: number;
  followers: number;
  followState: FollowState;
  covers: CollectionCover[];
}

type CandidateRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  subscribed: boolean;
  shared: number;
  sharedCat: string | null;
  topCat: string | null;
  mutual: number;
  followers: number;
  items: number;
};

/**
 * Collectors the viewer might like: people with public items in the same categories, and people followed by
 * the people they follow. Never the viewer, anyone they follow or have a pending request to, or anyone with
 * nothing public. Falls back to popular collectors (signed out, or a brand-new account).
 */
export async function suggestedCollectors(
  viewerId: string | null | undefined,
  opts: { limit?: number; category?: string | null; includeFollowed?: boolean } = {},
): Promise<SuggestedCollector[]> {
  const limit = Math.min(opts.limit ?? 10, 30);
  const category = opts.category ?? null;
  const includeFollowed = Boolean(opts.includeFollowed);
  const list = await cached(`people:${viewerId ?? "-"}:${category}:${limit}:${includeFollowed}`, async () => {
    const rows = await db.$queryRawUnsafe<CandidateRow[]>(
      `
      WITH my_cats AS (
        SELECT DISTINCT s.category FROM "Shelf" s JOIN "Page" p ON p.id = s."pageId"
        WHERE $1::text IS NOT NULL AND p."userId" = $1 AND s.category <> 'other'
      ),
      pub AS (
        SELECT p."userId" AS uid, s.category FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
        WHERE ${PUBLIC_SQL} AND ($3::text IS NULL OR s.category = $3)
      ),
      uc AS (
        SELECT uid, count(*)::int AS items,
               count(DISTINCT category) FILTER (WHERE category IN (SELECT category FROM my_cats))::int AS shared,
               mode() WITHIN GROUP (ORDER BY category) FILTER (WHERE category IN (SELECT category FROM my_cats)) AS "sharedCat",
               mode() WITHIN GROUP (ORDER BY category) FILTER (WHERE category <> 'other') AS "topCat"
        FROM pub GROUP BY uid
      ),
      fof AS (
        SELECT f2."followingId" AS uid, count(DISTINCT f1."followingId")::int AS n
        FROM "Follow" f1 JOIN "Follow" f2 ON f2."followerId" = f1."followingId"
        WHERE $1::text IS NOT NULL AND f1."followerId" = $1 GROUP BY f2."followingId"
      ),
      pop AS (SELECT "followingId" AS uid, count(*)::int AS n FROM "Follow" WHERE "followingId" IN (SELECT uid FROM uc) GROUP BY "followingId")
      SELECT u.id, u.username, u."displayName", u.bio, u."avatarUrl", u.subscribed,
             uc.shared, uc."sharedCat", uc."topCat", coalesce(fof.n, 0)::int AS mutual, coalesce(pop.n, 0)::int AS followers, uc.items
      FROM uc
      JOIN "User" u ON u.id = uc.uid
      LEFT JOIN fof ON fof.uid = uc.uid
      LEFT JOIN pop ON pop.uid = uc.uid
      WHERE ($1::text IS NULL OR (
        uc.uid <> $1
        AND ($4::boolean OR NOT EXISTS (SELECT 1 FROM "Follow" f WHERE f."followerId" = $1 AND f."followingId" = uc.uid))
        AND ($4::boolean OR NOT EXISTS (SELECT 1 FROM "FollowRequest" r WHERE r."requesterId" = $1 AND r."targetId" = uc.uid))
      ))
      ORDER BY (uc.shared * 3 + coalesce(fof.n, 0) * 2 + ln(1 + coalesce(pop.n, 0)) + ln(1 + uc.items) * 0.5) DESC, coalesce(pop.n, 0) DESC, u.id ASC
      LIMIT $2
      `,
      viewerId ?? null,
      limit,
      category,
      includeFollowed,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [mutualNames, covers] = await Promise.all([
      viewerId && rows.some((r) => r.mutual > 0)
        ? db.$queryRawUnsafe<Array<{ uid: string; username: string }>>(
            `SELECT DISTINCT ON (f2."followingId") f2."followingId" AS uid, u.username
             FROM "Follow" f1 JOIN "Follow" f2 ON f2."followerId" = f1."followingId" JOIN "User" u ON u.id = f1."followingId"
             WHERE f1."followerId" = $1 AND f2."followingId" = ANY($2::text[]) ORDER BY f2."followingId", f1."createdAt" DESC`,
            viewerId,
            ids,
          )
        : Promise.resolve([]),
      recentCoversByUser(ids, category, 3),
    ]);
    const mutualBy = new Map(mutualNames.map((m) => [m.uid, m.username]));
    return rows.map((r) => ({
      user: toPublicUser(r),
      reason: reasonFor(r, mutualBy.get(r.id)),
      itemCount: r.items,
      followers: r.followers,
      covers: covers.get(r.id) ?? [],
    }));
  });
  // Follow state is always fresh (never cached), so someone you just followed drops out of suggestions at once.
  const states = await followStates(viewerId, list.map((c) => c.user.id));
  const withState = list.map((c) => ({ ...c, followState: states.get(c.user.id) ?? ("none" as FollowState) }));
  return includeFollowed ? withState : withState.filter((c) => c.followState === "none");
}

function reasonFor(r: Pick<CandidateRow, "mutual" | "shared" | "sharedCat" | "topCat">, mutualName?: string): string {
  if (r.mutual > 0 && mutualName) return r.mutual > 1 ? `Followed by @${mutualName} + ${r.mutual - 1} more` : `Followed by @${mutualName}`;
  if (r.shared > 0 && r.sharedCat) return `Also collects ${categoryMeta(r.sharedCat).label}`;
  if (r.topCat) return `Collects ${categoryMeta(r.topCat).label}`;
  return "Popular on Museo";
}

async function recentCoversByUser(userIds: string[], category: string | null, per: number): Promise<Map<string, CollectionCover[]>> {
  const out = new Map<string, CollectionCover[]>();
  if (userIds.length === 0) return out;
  const rows = await db.$queryRawUnsafe<Array<CollectionCover & { uid: string }>>(
    `SELECT uid, id, title, "imageUrl", "faviconUrl", "siteName", type FROM (
       SELECT i."userId" AS uid, i.id, i.title, i."imageUrl", i."faviconUrl", i."siteName", i.type,
              row_number() OVER (PARTITION BY i."userId" ORDER BY (i."imageUrl" IS NULL), i."createdAt" DESC) AS rn
       FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
       WHERE ${PUBLIC_SQL} AND i."userId" = ANY($1::text[]) AND ($3::text IS NULL OR s.category = $3)
     ) t WHERE rn <= $2`,
    userIds,
    per,
    category,
  );
  for (const r of rows) {
    const { uid, ...c } = r;
    const list = out.get(uid) ?? [];
    list.push({ ...c, type: c.type === "PHOTO" ? "PHOTO" : "LINK" });
    out.set(uid, list);
  }
  return out;
}

/* ------------------------------------------------------------------ Topics */

export interface TopicSummary {
  slug: string;
  label: string;
  collectors: number;
  items: number;
}

export { isTopicSlug };

/** Topics with public items, by how many people collect in them. */
export async function topicList(limit = 16): Promise<TopicSummary[]> {
  return cached(`topics:${limit}`, async () => {
    const rows = await db.$queryRawUnsafe<Array<{ category: string; collectors: number; items: number }>>(
      `SELECT s.category, count(DISTINCT p."userId")::int AS collectors, count(*)::int AS items
       FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
       WHERE ${PUBLIC_SQL} AND s.category = ANY($1::text[])
       GROUP BY s.category ORDER BY collectors DESC, items DESC, s.category ASC LIMIT $2`,
      CATEGORY_IDS.filter(isTopicSlug),
      limit,
    );
    return rows.map((r) => ({ slug: r.category, label: categoryMeta(r.category).label, collectors: r.collectors, items: r.items }));
  });
}

export const TOPIC_RECENT_SIZE = 18;

export interface TopicItem extends CollectionCover {
  imageWidth: number | null;
  imageHeight: number | null;
  user: PublicUser;
  collection: string;
  savedByMe?: boolean;
}

/** Everything for /topics/[slug]. Null for unknown slugs. */
export async function getTopic(slug: string, viewerId?: string | null) {
  if (!isTopicSlug(slug)) return null;
  const meta = categoryMeta(slug);
  const [stats, trending, recent, people] = await Promise.all([
    cached(`topic-stats:${slug}`, async () => {
      const [r] = await db.$queryRawUnsafe<Array<{ collectors: number; items: number }>>(
        `SELECT count(DISTINCT p."userId")::int AS collectors, count(*)::int AS items
         FROM "Item" i JOIN "Shelf" s ON s.id = i."shelfId" JOIN "Page" p ON p.id = s."pageId"
         WHERE ${PUBLIC_SQL} AND s.category = $1`,
        slug,
      );
      return r ?? { collectors: 0, items: 0 };
    }),
    trendingCollections({ category: slug, limit: 8 }),
    cached(`topic-recent:${slug}`, () =>
      db.item.findMany({
        where: { ...publicItemFilter, shelf: { ...publicItemFilter.shelf, category: slug } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: TOPIC_RECENT_SIZE,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          faviconUrl: true,
          siteName: true,
          type: true,
          imageWidth: true,
          imageHeight: true,
          shelf: { select: { name: true } },
          user: { select: publicUserPreviewSelect },
        },
      }),
    ),
    suggestedCollectors(viewerId, { category: slug, limit: 8, includeFollowed: true }),
  ]);
  const saved = await savedIdsFor(viewerId, recent.map((r) => r.id));
  const items: TopicItem[] = recent.map((r) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    faviconUrl: r.faviconUrl,
    siteName: r.siteName,
    type: r.type === "PHOTO" ? "PHOTO" : "LINK",
    imageWidth: r.imageWidth,
    imageHeight: r.imageHeight,
    user: toPublicUser(r.user),
    collection: r.shelf.name,
    ...(viewerId ? { savedByMe: saved.has(r.id) } : {}),
  }));
  const group = CATEGORY_GROUPS.find((g) => g.items.some((c) => c.id === slug));
  const related = (group?.items ?? []).filter((c) => c.id !== slug).map((c) => ({ slug: c.id, label: c.label }));
  return { slug, label: meta.label, group: group?.name ?? null, stats, collections: trending.collections, items, collectors: people, related };
}

/** /explore's discovery rail: topics, trending collections and people. */
export async function discoverRail(viewerId?: string | null) {
  const [topics, trending, people] = await Promise.all([topicList(16), trendingCollections({ limit: 10 }), suggestedCollectors(viewerId, { limit: 10 })]);
  return { topics, trending: trending.collections, trendingFallback: trending.fallback, people };
}
