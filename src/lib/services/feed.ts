import { db } from "../db";
import { toTimelineEntry, toPublicUser } from "../mappers";
import { attachSocial } from "./social";
import { itemVisibleWhere, publicItemFilter } from "../visibility";
import type { CommentDTO, TimelineEntry } from "../dto";

export const FEED_PAGE_SIZE = 10;

const include = {
  user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, socialLinks: true } },
  shelf: { include: { page: true } },
} as const;

async function attachPreviewComments(items: TimelineEntry[]): Promise<TimelineEntry[]> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.id);
  const comments = await db.$queryRawUnsafe<
    Array<{ id: string; itemId: string; body: string; createdAt: Date; userId: string; username: string; displayName: string; bio: string; avatarUrl: string | null }>
  >(
    `
    SELECT c.id, c."itemId", c.body, c."createdAt", c."userId",
           u.username, u."displayName", u.bio, u."avatarUrl"
    FROM (
      SELECT *, row_number() OVER (PARTITION BY "itemId" ORDER BY "createdAt" DESC) AS rn
      FROM "ItemComment"
      WHERE "itemId" = ANY($1::text[])
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
      }),
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
  const items = await attachPreviewComments(await attachSocial(slice.map(toTimelineEntry), viewerId));
  return { items, nextCursor: hasMore ? slice[slice.length - 1].id : null };
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
