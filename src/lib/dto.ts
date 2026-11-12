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
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  visibility: "public" | "private";
}

export interface ShelfDTO {
  id: string;
  pageId: string;
  name: string;
  category: string;
  position: number;
  visibility: "public" | "private";
  items: ItemDTO[];
}

export interface PageDTO {
  id: string;
  title: string;
  description: string;
  position: number;
  visibility: "public" | "private";
  shelves: ShelfDTO[];
}

export interface SocialLinkDTO {
  network: string;
  url: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  socialLinks: SocialLinkDTO[];
}

export interface TimelineEntry extends ItemDTO {
  user: PublicUser;
  shelf: { id: string; name: string; category: string; visibility: "public" | "private" };
  page: { id: string; title: string; visibility: "public" | "private" };
  previewComments: CommentDTO[];
}

export interface ViewerDTO extends PublicUser {
  email: string;
  subscribed: boolean;
  subscriptionStatus: string;
}

export interface CommentDTO {
  id: string;
  body: string;
  createdAt: string;
  user: PublicUser;
}

export type SearchKind = "person" | "item" | "shelf";
export type SearchSort = "relevance" | "new" | "top";
export type SearchType = "all" | "people" | "items" | "shelves";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string | null;
  createdAt: string;
  score: number;
}
