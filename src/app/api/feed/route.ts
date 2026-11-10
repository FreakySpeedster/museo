import { route, ok } from "@/lib/api";
import { followingFeed, globalFeed } from "@/lib/services/feed";
import { feedQuerySchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export const GET = route(async ({ req, user }) => {
  const sp = new URL(req.url).searchParams;
  const q = feedQuerySchema.parse({ scope: sp.get("scope") ?? undefined, cursor: sp.get("cursor") ?? undefined });
  if (q.scope === "following") {
    if (!user) throw new AppError("UNAUTHORIZED", "Please sign in to see your following feed");
    return ok(await followingFeed(user.id, q.cursor));
  }
  return ok(await globalFeed(q.cursor));
});
