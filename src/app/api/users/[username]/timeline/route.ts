import { route, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { userTimeline } from "@/lib/services/feed";

export const GET = route<{ username: string }>(async ({ req, user: viewer, params }) => {
  const user = await db.user.findUnique({ where: { username: params.username.toLowerCase() }, select: { id: true } });
  if (!user) throw new AppError("NOT_FOUND", "User not found");
  const cursor = new URL(req.url).searchParams.get("cursor") ?? undefined;
  return ok(await userTimeline(user.id, cursor?.slice(0, 60), viewer?.id));
});
