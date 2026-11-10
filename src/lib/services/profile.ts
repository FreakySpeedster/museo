import { db } from "../db";
import { toPageDTO, toPublicUser } from "../mappers";
import { listPages } from "./pages";
import { userTimeline } from "./feed";

export async function getProfile(username: string, viewerId?: string | null) {
  const user = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) return null;
  const [pages, timeline, followers, following, follow, itemCount] = await Promise.all([
    listPages(user.id),
    userTimeline(user.id),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    viewerId ? db.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }) : null,
    db.item.count({ where: { userId: user.id } }),
  ]);
  return {
    user: toPublicUser(user),
    pages: pages.map(toPageDTO),
    timeline,
    stats: { followers, following, items: itemCount },
    isFollowing: Boolean(follow),
    isOwner: viewerId === user.id,
  };
}
