import { db } from "../db";
import { AppError } from "../errors";
import { canViewItem } from "../visibility";
import { toItemDTO, toPublicUser } from "../mappers";
import type { CommentDTO, ItemDTO } from "../dto";
import type { Item } from "@prisma/client";

export async function attachSocial<T extends { id: string }>(items: T[], viewerId?: string | null): Promise<T[]> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.id);
  const [likeGroups, commentGroups, myLikes] = await Promise.all([
    db.itemLike.groupBy({ by: ["itemId"], where: { itemId: { in: ids } }, _count: { _all: true } }),
    db.itemComment.groupBy({ by: ["itemId"], where: { itemId: { in: ids } }, _count: { _all: true } }),
    viewerId ? db.itemLike.findMany({ where: { userId: viewerId, itemId: { in: ids } }, select: { itemId: true } }) : Promise.resolve([]),
  ]);
  const likes = new Map(likeGroups.map((g) => [g.itemId, g._count._all]));
  const comments = new Map(commentGroups.map((g) => [g.itemId, g._count._all]));
  const mine = new Set(myLikes.map((l) => l.itemId));
  return items.map((item) => ({
    ...item,
    likeCount: likes.get(item.id) ?? 0,
    commentCount: comments.get(item.id) ?? 0,
    likedByMe: mine.has(item.id),
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
    include: { user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, socialLinks: true } }, shelf: { include: { page: true } } },
  });
  if (!item || !canViewItem(item, viewerId)) throw new AppError("NOT_FOUND", "That item is gone.");
  return item;
}

export async function toggleLike(userId: string, itemId: string) {
  await loadVisibleItem(itemId, userId);
  const existing = await db.itemLike.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (existing) {
    await db.itemLike.delete({ where: { userId_itemId: { userId, itemId } } });
  } else {
    await db.itemLike.create({ data: { userId, itemId } });
  }
  const likeCount = await db.itemLike.count({ where: { itemId } });
  return { likedByMe: !existing, likeCount };
}

export async function listComments(itemId: string, viewerId?: string | null) {
  const item = await loadVisibleItem(itemId, viewerId);
  const comments = await db.itemComment.findMany({
    where: { itemId },
    include: { user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const allowed = viewerId ? await canCommentOnItem(viewerId, item.userId) : false;
  let reason: string | null = null;
  if (!viewerId) reason = "Sign in to comment.";
  else if (!allowed) reason = `Follow ${item.user.displayName} to leave a comment.`;
  return {
    comments: comments.map(toCommentDTO),
    canComment: allowed,
    reason,
    owner: toPublicUser(item.user),
  };
}

export async function addComment(userId: string, itemId: string, body: string): Promise<CommentDTO> {
  const item = await loadVisibleItem(itemId, userId);
  if (!(await canCommentOnItem(userId, item.userId))) {
    throw new AppError("FORBIDDEN", `Follow ${item.user.displayName} to leave a comment.`);
  }
  const row = await db.itemComment.create({
    data: { itemId, userId, body },
    include: { user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true } } },
  });
  return toCommentDTO(row);
}

export async function deleteComment(userId: string, commentId: string) {
  const row = await db.itemComment.findUnique({ where: { id: commentId } });
  if (!row) throw new AppError("NOT_FOUND", "That comment is gone.");
  if (row.userId !== userId) throw new AppError("FORBIDDEN", "You can only delete your own comments.");
  await db.itemComment.delete({ where: { id: commentId } });
}

function toCommentDTO(row: {
  id: string;
  body: string;
  createdAt: Date;
  user: { id: string; username: string; displayName: string; bio: string; avatarUrl: string | null };
}): CommentDTO {
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), user: toPublicUser(row.user) };
}

export async function toItemDTOWithSocial(item: Item, viewerId?: string | null): Promise<ItemDTO> {
  const [dto] = await attachSocial([toItemDTO(item)], viewerId);
  return dto;
}
