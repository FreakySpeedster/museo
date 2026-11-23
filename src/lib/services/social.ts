import { db } from "../db";
import { AppError } from "../errors";
import { canViewItem } from "../visibility";
import { notify } from "./notifications";
import { savedIdsFor } from "./saves";
import { publicUserPreviewSelect, publicUserSelect, toItemDTO, toPublicUser } from "../mappers";
import type { CommentDTO, ItemDTO, ReactionDTO } from "../dto";
import type { Item } from "@prisma/client";

export async function attachSocial<T extends { id: string }>(items: T[], viewerId?: string | null): Promise<T[]> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.id);
  const [likeGroups, commentGroups, myLikes, mySaves] = await Promise.all([
    db.itemLike.groupBy({ by: ["itemId"], where: { itemId: { in: ids } }, _count: { _all: true } }),
    db.itemComment.groupBy({ by: ["itemId"], where: { itemId: { in: ids } }, _count: { _all: true } }),
    viewerId ? db.itemLike.findMany({ where: { userId: viewerId, itemId: { in: ids } }, select: { itemId: true } }) : Promise.resolve([]),
    savedIdsFor(viewerId, ids),
  ]);
  const likes = new Map(likeGroups.map((g) => [g.itemId, g._count._all]));
  const comments = new Map(commentGroups.map((g) => [g.itemId, g._count._all]));
  const mine = new Set(myLikes.map((l) => l.itemId));
  return items.map((item) => ({
    ...item,
    likeCount: likes.get(item.id) ?? 0,
    commentCount: comments.get(item.id) ?? 0,
    likedByMe: mine.has(item.id),
    ...(viewerId ? { savedByMe: mySaves.has(item.id) } : {}),
  }));
}

export async function canCommentOnItem(viewerId: string, ownerId: string): Promise<boolean> {
  if (viewerId === ownerId) return true;
  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: ownerId } },
    select: { followerId: true },
  });
  return Boolean(follow);
}


async function loadVisibleItem(itemId: string, viewerId?: string | null) {
  const item = await db.item.findUnique({
    where: { id: itemId },
    include: { user: { select: publicUserSelect }, shelf: { include: { page: true } } },
  });
  if (!item || !canViewItem(item, viewerId)) throw new AppError("NOT_FOUND", "That item is gone.");
  return item;
}

export async function toggleLike(userId: string, itemId: string) {
  const item = await loadVisibleItem(itemId, userId);
  const existing = await db.itemLike.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (existing) {
    await db.itemLike.delete({ where: { userId_itemId: { userId, itemId } } });
    // Unlike retracts the notification so like/unlike spam doesn't pile up.
    await db.notification.deleteMany({ where: { userId: item.userId, actorId: userId, itemId, type: "LIKE" } });
  } else {
    await db.itemLike.create({ data: { userId, itemId } });
    await notify({ userId: item.userId, actorId: userId, type: "LIKE", itemId });
  }
  const likeCount = await db.itemLike.count({ where: { itemId } });
  return { likedByMe: !existing, likeCount };
}

const commentInclude = {
  user: { select: publicUserPreviewSelect },
  reactions: { select: { emoji: true, userId: true } },
} as const;

export async function listComments(itemId: string, viewerId?: string | null) {
  const item = await loadVisibleItem(itemId, viewerId);
  const comments = await db.itemComment.findMany({
    where: { itemId },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const allowed = viewerId ? await canCommentOnItem(viewerId, item.userId) : false;
  let reason: string | null = null;
  if (!viewerId) reason = "Sign in to comment.";
  else if (!allowed) reason = `Follow ${item.user.displayName} to leave a comment.`;
  return {
    comments: comments.map((c) => toCommentDTO(c, viewerId)),
    canComment: allowed,
    reason,
    owner: toPublicUser(item.user),
  };
}

export async function addComment(userId: string, itemId: string, body: string, parentId?: string): Promise<CommentDTO> {
  const item = await loadVisibleItem(itemId, userId);
  if (!(await canCommentOnItem(userId, item.userId))) {
    throw new AppError("FORBIDDEN", `Follow ${item.user.displayName} to leave a comment.`);
  }
  let replyTo: string | null = null;
  if (parentId) {
    // One level of threading: replying to a reply attaches to its top-level comment.
    const parent = await db.itemComment.findUnique({ where: { id: parentId }, select: { itemId: true, parentId: true, userId: true } });
    if (!parent || parent.itemId !== itemId) throw new AppError("NOT_FOUND", "That comment is gone.");
    parentId = parent.parentId ?? parentId;
    replyTo = parent.userId;
  }
  const row = await db.itemComment.create({ data: { itemId, userId, body, parentId: parentId ?? null }, include: commentInclude });
  await notify({ userId: item.userId, actorId: userId, type: "COMMENT", itemId, commentId: row.id });
  if (replyTo && replyTo !== item.userId) await notify({ userId: replyTo, actorId: userId, type: "REPLY", itemId, commentId: row.id });
  return toCommentDTO(row, userId);
}

/** Toggle one emoji reaction; a user may leave several different emojis on the same comment. */
export async function toggleReaction(userId: string, commentId: string, emoji: string): Promise<CommentDTO> {
  const row = await db.itemComment.findUnique({ where: { id: commentId }, select: { itemId: true } });
  if (!row) throw new AppError("NOT_FOUND", "That comment is gone.");
  await loadVisibleItem(row.itemId, userId);
  const key = { commentId_userId_emoji: { commentId, userId, emoji } };
  const existing = await db.commentReaction.findUnique({ where: key });
  if (existing) await db.commentReaction.delete({ where: key });
  else await db.commentReaction.create({ data: { commentId, userId, emoji } });
  const fresh = await db.itemComment.findUniqueOrThrow({ where: { id: commentId }, include: commentInclude });
  return toCommentDTO(fresh, userId);
}

export async function deleteComment(userId: string, commentId: string) {
  const row = await db.itemComment.findUnique({ where: { id: commentId } });
  if (!row) throw new AppError("NOT_FOUND", "That comment is gone.");
  if (row.userId !== userId) throw new AppError("FORBIDDEN", "You can only delete your own comments.");
  await db.itemComment.delete({ where: { id: commentId } });
}

function toCommentDTO(
  row: {
    id: string;
    body: string;
    createdAt: Date;
    parentId: string | null;
    user: { id: string; username: string; displayName: string; bio: string; avatarUrl: string | null; subscribed: boolean };
    reactions: Array<{ emoji: string; userId: string }>;
  },
  viewerId?: string | null,
): CommentDTO {
  const map = new Map<string, ReactionDTO>();
  for (const r of row.reactions) {
    const cur = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    cur.count++;
    if (viewerId && r.userId === viewerId) cur.mine = true;
    map.set(r.emoji, cur);
  }
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), user: toPublicUser(row.user), parentId: row.parentId, reactions: [...map.values()] };
}

export async function toItemDTOWithSocial(item: Item, viewerId?: string | null): Promise<ItemDTO> {
  const [dto] = await attachSocial([toItemDTO(item)], viewerId);
  return dto;
}
