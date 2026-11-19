import type { Item, Shelf, Page, User, Prisma } from "@prisma/client";
import type { ItemDTO, PageDTO, PublicUser, ShelfDTO, TimelineEntry, ViewerDTO } from "./dto";
import { normalizeSocialLinks } from "./social-links";

const vis = (v?: string | null): "public" | "private" => (v === "private" ? "private" : "public");

export const toItemDTO = (i: Item): ItemDTO => ({
  id: i.id,
  shelfId: i.shelfId,
  type: i.type === "PHOTO" ? "PHOTO" : "LINK",
  url: i.url,
  imageUrl: i.imageUrl,
  images: i.images ?? [],
  faviconUrl: i.faviconUrl,
  title: i.title,
  description: i.description,
  siteName: i.siteName,
  tags: i.tags ?? [],
  position: i.position,
  createdAt: i.createdAt.toISOString(),
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  visibility: vis(i.visibility),
  viewCount: i.viewCount ?? 0,
  imageWidth: i.imageWidth ?? null,
  imageHeight: i.imageHeight ?? null,
  canonicalKey: i.canonicalKey ?? null,
  sourceItemId: i.sourceItemId ?? null,
});

export const toShelfDTO = (s: Shelf & { items?: Item[] }): ShelfDTO => ({
  id: s.id,
  pageId: s.pageId,
  name: s.name,
  category: s.category,
  position: s.position,
  visibility: vis(s.visibility),
  items: (s.items ?? []).map(toItemDTO),
});

export const toPageDTO = (p: Page & { shelves?: Array<Shelf & { items?: Item[] }> }): PageDTO => ({
  id: p.id,
  title: p.title,
  description: p.description,
  position: p.position,
  visibility: vis(p.visibility),
  shelves: (p.shelves ?? []).map(toShelfDTO),
});

export const toPublicUser = (
  u: Pick<User, "id" | "username" | "displayName" | "bio" | "avatarUrl"> & { socialLinks?: Prisma.JsonValue | null },
): PublicUser => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
  socialLinks: normalizeSocialLinks(u.socialLinks ?? []),
});

export const toViewerDTO = (u: User): ViewerDTO => ({
  ...toPublicUser(u),
  email: u.email,
  subscribed: u.subscribed,
  subscriptionStatus: u.subscriptionStatus,
  followPolicy: u.followPolicy === "open" ? "open" : "request",
});

type EntryRow = Item & {
  user: Pick<User, "id" | "username" | "displayName" | "bio" | "avatarUrl"> & { socialLinks?: Prisma.JsonValue | null };
  shelf: Shelf & { page: Page };
};
export const toTimelineEntry = (i: EntryRow): TimelineEntry => ({
  ...toItemDTO(i),
  user: toPublicUser(i.user),
  shelf: { id: i.shelf.id, name: i.shelf.name, category: i.shelf.category, visibility: vis(i.shelf.visibility) },
  page: { id: i.shelf.page.id, title: i.shelf.page.title, visibility: vis(i.shelf.page.visibility) },
  previewComments: [],
});
