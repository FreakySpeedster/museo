import { db } from "../db";
import { toPageDTO, toPublicUser } from "../mappers";
import { listPages } from "./pages";
import { userTimeline } from "./feed";
import { attachSocial } from "./social";
import type { ItemDTO, PageDTO } from "../dto";

export async function getProfile(username: string, viewerId?: string | null) {
  const user = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) return null;
  const [pages, timeline, followers, following, follow, itemCount] = await Promise.all([
    listPages(user.id),
    userTimeline(user.id, undefined, viewerId),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    viewerId ? db.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }) : null,
    db.item.count({ where: { userId: user.id } }),
  ]);
  return {
    user: toPublicUser(user),
    pages: await attachPagesSocial(pages.map(toPageDTO), viewerId),
    timeline,
    stats: { followers, following, items: itemCount },
    isFollowing: Boolean(follow),
    isOwner: viewerId === user.id,
  };
}

async function attachPagesSocial(pages: PageDTO[], viewerId?: string | null): Promise<PageDTO[]> {
  const items: ItemDTO[] = pages.flatMap((p) => p.shelves.flatMap((s) => s.items));
  const social = await attachSocial(items, viewerId);
  const byId = new Map(social.map((i) => [i.id, i]));
  return pages.map((p) => ({
    ...p,
    shelves: p.shelves.map((s) => ({ ...s, items: s.items.map((i) => byId.get(i.id) ?? i) })),
  }));
}
