import { db } from "../db";
import { toTimelineEntry } from "../mappers";

export const FEED_PAGE_SIZE = 18;

const include = {
  user: { select: { id: true, username: true, displayName: true, bio: true } },
  shelf: { include: { page: true } },
} as const;

async function paged(where: object, cursor?: string) {
  const rows = await db.item.findMany({
    where,
    include,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const slice = rows.slice(0, FEED_PAGE_SIZE);
  return { items: slice.map(toTimelineEntry), nextCursor: hasMore ? slice[slice.length - 1].id : null };
}

export const userTimeline = (userId: string, cursor?: string) => paged({ userId }, cursor);

export const globalFeed = (cursor?: string) => paged({}, cursor);

export async function followingFeed(viewerId: string, cursor?: string) {
  const follows = await db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const ids = [viewerId, ...follows.map((f) => f.followingId)];
  return paged({ userId: { in: ids } }, cursor);
}
