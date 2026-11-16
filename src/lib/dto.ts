export interface ItemDTO {
  id: string;
  shelfId: string;
  type: "LINK" | "PHOTO";
  url: string | null;
  imageUrl: string | null;
  /** Extra photos after the cover, in order. */
  images: string[];
  faviconUrl: string | null;
  title: string;
  description: string;
  tags: string[];
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
  followPolicy: FollowPolicy;
}

export interface CommentDTO {
  id: string;
  body: string;
  createdAt: string;
  user: PublicUser;
  parentId: string | null;
  reactions: ReactionDTO[];
}

export interface ReactionDTO {
  emoji: string;
  count: number;
  mine: boolean;
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

export type NotificationType = "LIKE" | "COMMENT" | "REPLY" | "FOLLOW" | "FOLLOW_REQUEST" | "FOLLOW_ACCEPTED";
export type FollowPolicy = "request" | "open";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  actor: PublicUser;
  item: { id: string; title: string; imageUrl: string | null } | null;
  /** Comment text for COMMENT / REPLY. */
  excerpt: string | null;
  /** FOLLOW_REQUEST only: still awaiting a decision. */
  pending?: boolean;
}
