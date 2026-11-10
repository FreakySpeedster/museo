import { route, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

async function target(username: string, viewerId: string) {
  const t = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!t) throw new AppError("NOT_FOUND", "User not found");
  if (t.id === viewerId) throw new AppError("BAD_REQUEST", "You can't follow yourself");
  return t;
}

export const POST = route<{ username: string }>(
  async ({ user, params }) => {
    const t = await target(params.username, user.id);
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: t.id } },
      create: { followerId: user.id, followingId: t.id },
      update: {},
    });
    return ok({ following: true });
  },
  { auth: true },
);

export const DELETE = route<{ username: string }>(
  async ({ user, params }) => {
    const t = await target(params.username, user.id);
    await db.follow.deleteMany({ where: { followerId: user.id, followingId: t.id } });
    return ok({ following: false });
  },
  { auth: true },
);
