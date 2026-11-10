import type { Item, Shelf, Page, User } from "@prisma/client";
import type { ItemDTO, PageDTO, PublicUser, ShelfDTO, TimelineEntry, ViewerDTO } from "./dto";

export const toItemDTO = (i: Item): ItemDTO => ({
  id: i.id,
  shelfId: i.shelfId,
  type: i.type === "PHOTO" ? "PHOTO" : "LINK",
  url: i.url,
  imageUrl: i.imageUrl,
  faviconUrl: i.faviconUrl,
  title: i.title,
  description: i.description,
  siteName: i.siteName,
  position: i.position,
  createdAt: i.createdAt.toISOString(),
});

export const toShelfDTO = (s: Shelf & { items?: Item[] }): ShelfDTO => ({
  id: s.id,
  pageId: s.pageId,
  name: s.name,
  category: s.category,
  position: s.position,
  items: (s.items ?? []).map(toItemDTO),
});

export const toPageDTO = (p: Page & { shelves?: Array<Shelf & { items?: Item[] }> }): PageDTO => ({
  id: p.id,
  title: p.title,
  description: p.description,
  emoji: p.emoji,
  position: p.position,
  shelves: (p.shelves ?? []).map(toShelfDTO),
});

export const toPublicUser = (u: Pick<User, "id" | "username" | "displayName" | "bio">): PublicUser => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  bio: u.bio,
});

export const toViewerDTO = (u: User): ViewerDTO => ({
  ...toPublicUser(u),
  email: u.email,
  subscribed: u.subscribed,
  subscriptionStatus: u.subscriptionStatus,
});

type EntryRow = Item & {
  user: Pick<User, "id" | "username" | "displayName" | "bio">;
  shelf: Shelf & { page: Page };
};
export const toTimelineEntry = (i: EntryRow): TimelineEntry => ({
  ...toItemDTO(i),
  user: toPublicUser(i.user),
  shelf: { id: i.shelf.id, name: i.shelf.name, category: i.shelf.category },
  page: { id: i.shelf.page.id, title: i.shelf.page.title, emoji: i.shelf.page.emoji },
});
