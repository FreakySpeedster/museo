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
  /** On the viewer's private Want list (only ever sent to that viewer). */
  savedByMe?: boolean;
  visibility: "public" | "private";
  /** Unique views from other people (24h dedupe). */
  viewCount: number;
  /** Cover size in px when known (lets feeds reserve space). */
  imageWidth: number | null;
  imageHeight: number | null;
  /** Groups the same thing across users (Explore). */
  canonicalKey: string | null;
  /** Set on copies made with "Add to my collection". */
  sourceItemId: string | null;
  /** When the owner last changed the link ("Link edited"). */
  urlEditedAt?: string | null;
  /** Why the outbound link gets a warning: reported by several people, or the safety check couldn't run. */
  linkFlag?: "reported" | "unverified" | null;
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
  /** Public Plus badge. Billing details stay on ViewerDTO only. */
  subscribed: boolean;
}

export interface TimelineEntry extends ItemDTO {
  user: PublicUser;
  shelf: { id: string; name: string; category: string; visibility: "public" | "private" };
  page: { id: string; title: string; visibility: "public" | "private" };
  previewComments: CommentDTO[];
  /** Viewer-relative extras on feed posts. */
  collected?: Array<{ shelfId: string; shelfName: string }>;
  canComment?: boolean;
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
  /** Set on person hits so the Plus seal can render without a second query. */
  subscribed?: boolean;
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

export interface ConnectionDTO extends PublicUser {
  isViewer: boolean;
  followState: "none" | "requested" | "following";
}

export type BlogStatus = "draft" | "published";

/** An item tagged in a blog post (only the ones the reader may see). */
export interface TaggedItemDTO {
  id: string;
  title: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  collection: string;
  username: string;
}

export interface BlogPostSummaryDTO {
  id: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  updatedAt: string;
  author: PublicUser;
  itemCount: number;
}

export interface BlogPostDTO extends BlogPostSummaryDTO {
  contentHtml: string;
  items: TaggedItemDTO[];
}
