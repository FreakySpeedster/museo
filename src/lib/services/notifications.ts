import { db } from "../db";
import { AppError } from "../errors";
import { publicUserPreviewSelect, toPublicUser } from "../mappers";
import type { NotificationDTO, NotificationType } from "../dto";

const PAGE_SIZE = 30;

/** Best-effort: a failed notification must never break the action that caused it. */
export async function notify(n: { userId: string; actorId: string; type: NotificationType; itemId?: string; commentId?: string }) {
  if (n.userId === n.actorId) return;
  try {
    await db.notification.create({ data: { ...n, itemId: n.itemId ?? null, commentId: n.commentId ?? null } });
  } catch (e) {
    console.error("notify failed", e);
  }
}

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function listNotifications(userId: string, cursor?: string | null): Promise<{ notifications: NotificationDTO[]; nextCursor: string | null }> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: { select: publicUserPreviewSelect },
      item: { select: { id: true, title: true, imageUrl: true } },
      comment: { select: { body: true } },
    },
  });
  const more = rows.length > PAGE_SIZE;
  const page = more ? rows.slice(0, PAGE_SIZE) : rows;
  // Which follow requests are still pending (so the list can show Accept / Reject).
  const reqActors = page.filter((r) => r.type === "FOLLOW_REQUEST").map((r) => r.actorId);
  const pending = reqActors.length
    ? new Set((await db.followRequest.findMany({ where: { targetId: userId, requesterId: { in: reqActors } }, select: { requesterId: true } })).map((r) => r.requesterId))
    : new Set<string>();
  return {
    nextCursor: more ? page[page.length - 1].id : null,
    notifications: page.map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      createdAt: r.createdAt.toISOString(),
      read: Boolean(r.readAt),
      actor: toPublicUser(r.actor),
      item: r.item ? { id: r.item.id, title: r.item.title, imageUrl: r.item.imageUrl } : null,
      excerpt: r.comment ? r.comment.body.slice(0, 140) : null,
      pending: r.type === "FOLLOW_REQUEST" ? pending.has(r.actorId) : undefined,
    })),
  };
}

/* ------------------------------------------------------------------ follows */

export type FollowState = "none" | "requested" | "following";

async function findTarget(username: string, viewerId: string) {
  const t = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, followPolicy: true } });
  if (!t) throw new AppError("NOT_FOUND", "User not found");
  if (t.id === viewerId) throw new AppError("BAD_REQUEST", "You can't follow yourself");
  return t;
}

export async function followState(viewerId: string, targetId: string): Promise<FollowState> {
  const [f, r] = await Promise.all([
    db.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: targetId } }, select: { followerId: true } }),
    db.followRequest.findUnique({ where: { requesterId_targetId: { requesterId: viewerId, targetId } }, select: { requesterId: true } }),
  ]);
  return f ? "following" : r ? "requested" : "none";
}

/** Follow, or send a request when the target approves followers. Idempotent. */
export async function follow(viewerId: string, username: string): Promise<FollowState> {
  const t = await findTarget(username, viewerId);
  const current = await followState(viewerId, t.id);
  if (current !== "none") return current;
  if (t.followPolicy === "open") {
    await db.follow.create({ data: { followerId: viewerId, followingId: t.id } });
    await notify({ userId: t.id, actorId: viewerId, type: "FOLLOW" });
    return "following";
  }
  await db.followRequest.create({ data: { requesterId: viewerId, targetId: t.id } });
  await notify({ userId: t.id, actorId: viewerId, type: "FOLLOW_REQUEST" });
  return "requested";
}

/** Unfollow or cancel a pending request. */
export async function unfollow(viewerId: string, username: string): Promise<FollowState> {
  const t = await findTarget(username, viewerId);
  await db.$transaction([
    db.follow.deleteMany({ where: { followerId: viewerId, followingId: t.id } }),
    db.followRequest.deleteMany({ where: { requesterId: viewerId, targetId: t.id } }),
    db.notification.deleteMany({ where: { userId: t.id, actorId: viewerId, type: { in: ["FOLLOW", "FOLLOW_REQUEST"] } } }),
  ]);
  return "none";
}

async function acceptRequests(targetId: string, requesterIds: string[]) {
  if (requesterIds.length === 0) return;
  await db.$transaction([
    db.follow.createMany({ data: requesterIds.map((id) => ({ followerId: id, followingId: targetId })), skipDuplicates: true }),
    db.followRequest.deleteMany({ where: { targetId, requesterId: { in: requesterIds } } }),
    // The request notification becomes "started following you".
    db.notification.updateMany({ where: { userId: targetId, actorId: { in: requesterIds }, type: "FOLLOW_REQUEST" }, data: { type: "FOLLOW" } }),
    db.notification.createMany({ data: requesterIds.map((id) => ({ userId: id, actorId: targetId, type: "FOLLOW_ACCEPTED" })) }),
  ]);
}

export async function respondToRequest(targetId: string, requesterUsername: string, accept: boolean) {
  const requester = await db.user.findUnique({ where: { username: requesterUsername.toLowerCase() }, select: { id: true } });
  const req = requester && (await db.followRequest.findUnique({ where: { requesterId_targetId: { requesterId: requester.id, targetId } } }));
  if (!requester || !req) throw new AppError("NOT_FOUND", "That request is no longer pending");
  if (accept) return acceptRequests(targetId, [requester.id]);
  await db.$transaction([
    db.followRequest.delete({ where: { requesterId_targetId: { requesterId: requester.id, targetId } } }),
    db.notification.deleteMany({ where: { userId: targetId, actorId: requester.id, type: "FOLLOW_REQUEST" } }),
  ]);
}

/** Switching to "open" approves everyone who is waiting. */
export async function setFollowPolicy(userId: string, policy: "request" | "open") {
  await db.user.update({ where: { id: userId }, data: { followPolicy: policy } });
  if (policy === "open") {
    const waiting = await db.followRequest.findMany({ where: { targetId: userId }, select: { requesterId: true } });
    await acceptRequests(userId, waiting.map((w) => w.requesterId));
  }
}
