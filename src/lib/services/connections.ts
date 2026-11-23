import { db } from "../db";
import { AppError } from "../errors";
import { publicUserPreviewSelect, toPublicUser } from "../mappers";
import type { ConnectionDTO } from "../dto";
import type { FollowState } from "./notifications";

export const CONNECTIONS_PAGE_SIZE = 20;

function decodeCursor(c?: string | null): { at: Date; id: string } | null {
  if (!c) return null;
  const [ts, id] = c.split("_");
  const at = new Date(Number(ts));
  return id && !Number.isNaN(at.getTime()) ? { at, id } : null;
}

/** Follow state of the viewer towards each of the given users (one round trip each for follows and requests). */
export async function followStates(viewerId: string | null | undefined, ids: string[]): Promise<Map<string, FollowState>> {
  const out = new Map<string, FollowState>();
  if (!viewerId || ids.length === 0) return out;
  const [follows, requests] = await Promise.all([
    db.follow.findMany({ where: { followerId: viewerId, followingId: { in: ids } }, select: { followingId: true } }),
    db.followRequest.findMany({ where: { requesterId: viewerId, targetId: { in: ids } }, select: { targetId: true } }),
  ]);
  for (const r of requests) out.set(r.targetId, "requested");
  for (const f of follows) out.set(f.followingId, "following");
  return out;
}

/**
 * Followers or following of a user, newest first, with optional search by username / display name.
 * Lists are public (like the counts); private pages and items stay private.
 */
export async function listConnections(
  username: string,
  kind: "followers" | "following",
  viewerId: string | null | undefined,
  opts: { q?: string; cursor?: string | null; limit?: number } = {},
): Promise<{ users: ConnectionDTO[]; nextCursor: string | null }> {
  const target = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!target) throw new AppError("NOT_FOUND", "User not found");
  const take = Math.min(opts.limit ?? CONNECTIONS_PAGE_SIZE, 50);
  const q = opts.q?.trim().replace(/^@/, "").slice(0, 50);
  const match = q ? { OR: [{ username: { contains: q, mode: "insensitive" as const } }, { displayName: { contains: q, mode: "insensitive" as const } }] } : undefined;
  const cur = decodeCursor(opts.cursor);
  const otherKey = kind === "followers" ? "followerId" : "followingId";
  const after = cur ? { OR: [{ createdAt: { lt: cur.at } }, { createdAt: cur.at, [otherKey]: { lt: cur.id } }] } : {};
  const userSelect = { select: publicUserPreviewSelect } as const;
  const rows =
    kind === "followers"
      ? (await db.follow.findMany({
          where: { followingId: target.id, ...(match ? { follower: match } : {}), ...after },
          orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
          take: take + 1,
          select: { createdAt: true, follower: userSelect },
        })).map((r) => ({ createdAt: r.createdAt, user: r.follower }))
      : (await db.follow.findMany({
          where: { followerId: target.id, ...(match ? { following: match } : {}), ...after },
          orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
          take: take + 1,
          select: { createdAt: true, following: userSelect },
        })).map((r) => ({ createdAt: r.createdAt, user: r.following }));
  const more = rows.length > take;
  const page = more ? rows.slice(0, take) : rows;
  const states = await followStates(viewerId, page.map((r) => r.user.id));
  const last = page[page.length - 1];
  return {
    nextCursor: more && last ? `${last.createdAt.getTime()}_${last.user.id}` : null,
    users: page.map((r) => ({
      ...toPublicUser(r.user),
      isViewer: r.user.id === viewerId,
      followState: states.get(r.user.id) ?? "none",
    })),
  };
}
