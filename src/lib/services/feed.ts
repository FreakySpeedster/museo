import { db } from "../db";
import { toTimelineEntry } from "../mappers";
import { attachSocial } from "./social";

export const FEED_PAGE_SIZE = 12;

const include = {
  user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true } },
  shelf: { include: { page: true } },
} as const;

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
  const items = await attachSocial(slice.map(toTimelineEntry), viewerId);
  return { items, nextCursor: hasMore ? slice[slice.length - 1].id : null };
}

export const userTimeline = (userId: string, cursor?: string, viewerId?: string | null) => paged({ userId }, cursor, viewerId);

export const globalFeed = (cursor?: string, viewerId?: string | null) => paged({}, cursor, viewerId);

export async function followingFeed(viewerId: string, cursor?: string) {
  const follows = await db.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const ids = [viewerId, ...follows.map((f) => f.followingId)];
  return paged({ userId: { in: ids } }, cursor, viewerId);
}
