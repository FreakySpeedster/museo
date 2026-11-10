export interface ItemDTO {
  id: string;
  shelfId: string;
  type: "LINK" | "PHOTO";
  url: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  title: string;
  description: string;
  siteName: string | null;
  position: number;
  createdAt: string;
}

export interface ShelfDTO {
  id: string;
  pageId: string;
  name: string;
  category: string;
  position: number;
  items: ItemDTO[];
}

export interface PageDTO {
  id: string;
  title: string;
  description: string;
  emoji: string;
  position: number;
  shelves: ShelfDTO[];
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
}

export interface TimelineEntry extends ItemDTO {
  user: PublicUser;
  shelf: { id: string; name: string; category: string };
  page: { id: string; title: string; emoji: string };
}

export interface ViewerDTO extends PublicUser {
  email: string;
  subscribed: boolean;
  subscriptionStatus: string;
}
