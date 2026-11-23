import { db } from "../db";
import { toTimelineEntry, toPublicUser, publicUserSelect } from "../mappers";
import { attachSocial } from "./social";
import { itemVisibleWhere, publicItemFilter } from "../visibility";
import type { CommentDTO, TimelineEntry } from "../dto";
import { canonicalKeyFor } from "../canonical";
import { probeImageDims } from "../image-dims";

export const FEED_PAGE_SIZE = 10;

const include = {
  user: { select: publicUserSelect },
  shelf: { include: { page: true } },
} as const;

/** The first two top-level comments of each post (shown inline under it). */
export async function attachPreviewComments(items: TimelineEntry[]): Promise<TimelineEntry[]> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.id);
  const comments = await db.$queryRawUnsafe<
    Array<{ id: string; itemId: string; body: string; createdAt: Date; userId: string; username: string; displayName: string; bio: string; avatarUrl: string | null; subscribed: boolean }>
  >(
    `
    SELECT c.id, c."itemId", c.body, c."createdAt", c."userId",
           u.username, u."displayName", u.bio, u."avatarUrl", u.subscribed
    FROM (
      SELECT *, row_number() OVER (PARTITION BY "itemId" ORDER BY "createdAt" ASC) AS rn
      FROM "ItemComment"
      WHERE "itemId" = ANY($1::text[]) AND "parentId" IS NULL
    ) c
    JOIN "User" u ON u.id = c."userId"
    WHERE c.rn <= 2
    ORDER BY c."createdAt" ASC
    `,
    ids,
  );
  const byItem = new Map<string, CommentDTO[]>();
  for (const r of comments) {
    const list = byItem.get(r.itemId) ?? [];
    list.push({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      user: toPublicUser({
        id: r.userId,
        username: r.username,
        displayName: r.displayName,
        bio: r.bio,
        avatarUrl: r.avatarUrl,
        subscribed: r.subscribed,
      }),
      parentId: null,
      reactions: [],
    });
    byItem.set(r.itemId, list);
  }
  return items.map((i) => ({ ...i, previewComments: byItem.get(i.id) ?? [] }));
}

async function paged(where: object, cursor?: string, viewerId?: string | null) {
  const rows = await db.item.findMany({
    where,
    include,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const slice = rows.slice(0, FEED_PAGE_SIZE);
  const items = await decorateEntries(slice.map(toTimelineEntry), viewerId);
  return { items, nextCursor: hasMore ? slice[slice.length - 1].id : null };
}

/** Likes / comments, the first two comments, and viewer extras (where they already keep it, can they comment). */
export async function decorateEntries(entries: TimelineEntry[], viewerId?: string | null) {
  // Rows from before grouping keys existed get one in memory now; the stored backfill runs after the response.
  for (const e of entries) if (!e.canonicalKey) e.canonicalKey = canonicalKeyFor(e);
  return attachViewerExtras(await attachPreviewComments(await attachSocial(entries, viewerId)), viewerId);
}

export async function attachViewerExtras(items: TimelineEntry[], viewerId?: string | null): Promise<TimelineEntry[]> {
  if (!viewerId || items.length === 0) return items;
  const keys = [...new Set(items.map((i) => i.canonicalKey).filter((k): k is string => Boolean(k)))];
  const roots = [...new Set(items.map((i) => i.sourceItemId ?? i.id))];
  const owners = [...new Set(items.map((i) => i.user.id).filter((id) => id !== viewerId))];
  const [mine, follows] = await Promise.all([
    db.item.findMany({
      where: { userId: viewerId, OR: [{ canonicalKey: { in: keys } }, { sourceItemId: { in: roots } }, { id: { in: roots } }] },
      select: { id: true, canonicalKey: true, sourceItemId: true, shelf: { select: { id: true, name: true } } },
    }),
    owners.length ? db.follow.findMany({ where: { followerId: viewerId, followingId: { in: owners } }, select: { followingId: true } }) : Promise.resolve([]),
  ]);
  const followed = new Set(follows.map((f) => f.followingId));
  return items.map((i) => {
    const root = i.sourceItemId ?? i.id;
    const shelves = new Map<string, string>();
    if (i.user.id !== viewerId) {
      for (const m of mine) {
        if ((i.canonicalKey && m.canonicalKey === i.canonicalKey) || m.sourceItemId === root || m.id === root) shelves.set(m.shelf.id, m.shelf.name);
      }
    }
    return {
      ...i,
      collected: [...shelves].map(([shelfId, shelfName]) => ({ shelfId, shelfName })),
      canComment: i.user.id === viewerId || followed.has(i.user.id),
    };
  });
}

/** Lazily store grouping keys and cover sizes for older rows (run after the response, a few at a time). */
export async function backfillItemMeta(entries: Array<Pick<TimelineEntry, "id" | "type" | "url" | "title" | "imageUrl" | "imageWidth">>, max = 6) {
  const todo = entries.slice(0, 30);
  const rows = await db.item.findMany({ where: { id: { in: todo.map((e) => e.id) } }, select: { id: true, type: true, url: true, title: true, imageUrl: true, imageWidth: true, canonicalKey: true } });
  let probes = 0;
  for (const r of rows) {
    const data: { canonicalKey?: string | null; imageWidth?: number; imageHeight?: number } = {};
    if (!r.canonicalKey) data.canonicalKey = canonicalKeyFor(r);
    if (r.imageUrl && r.imageWidth == null && probes < max) {
      probes++;
      const d = await probeImageDims(r.imageUrl);
      if (d) Object.assign(data, { imageWidth: d.width, imageHeight: d.height });
    }
    if (Object.keys(data).length) await db.item.update({ where: { id: r.id }, data }).catch(() => {});
  }
}

export const userTimeline = (userId: string, cursor?: string, viewerId?: string | null) =>
  paged({ userId }, cursor, viewerId);

export const globalFeed = (cursor?: string, viewerId?: string | null) => paged({ ...publicItemFilter }, cursor, viewerId);

export async function followingFeed(viewerId: string, cursor?: string) {
  const follows = await db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const ids = follows.map((f) => f.followingId);
  return paged(
    {
      OR: [{ userId: viewerId }, ids.length ? { userId: { in: ids }, ...publicItemFilter } : { id: "__none__" }],
    },
    cursor,
    viewerId,
  );
}

export { itemVisibleWhere };
