import { followState, type FollowState } from "./notifications";
import { db } from "../db";
import { toPageDTO, toPublicUser } from "../mappers";
import { listPages } from "./pages";
import { attachSocial } from "./social";
import { publicItemFilter } from "../visibility";
import type { ItemDTO, PageDTO } from "../dto";

export function filterPagesForViewer(pages: PageDTO[], isOwner: boolean): PageDTO[] {
  if (isOwner) return pages;
  return pages
    .filter((p) => p.visibility === "public")
    .map((p) => ({
      ...p,
      shelves: p.shelves
        .filter((s) => s.visibility === "public")
        .map((s) => ({ ...s, items: s.items.filter((i) => i.visibility === "public") })),
    }));
}

export async function getProfile(username: string, viewerId?: string | null) {
  const user = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) return null;
  const isOwner = viewerId === user.id;
  const [pages, followers, following, follow, itemCount, blogCount] = await Promise.all([
    listPages(user.id),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    viewerId && !isOwner ? followState(viewerId, user.id) : ("none" as FollowState),
    db.item.count({ where: isOwner ? { userId: user.id } : { userId: user.id, ...publicItemFilter } }),
    db.blogPost.count({ where: { userId: user.id, status: "published" } }),
  ]);
  const visible = filterPagesForViewer(pages.map(toPageDTO), isOwner);
  return {
    user: toPublicUser(user),
    pages: await attachPagesSocial(visible, viewerId),
    stats: { followers, following, items: itemCount, posts: blogCount },
    isFollowing: follow === "following",
    followState: follow,
    isOwner,
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
