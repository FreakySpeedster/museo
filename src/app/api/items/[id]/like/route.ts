import { route, ok } from "@/lib/api";
import { toggleLike } from "@/lib/services/social";

export const POST = route<{ id: string }>(
  async ({ user, params }) => ok(await toggleLike(user.id, params.id)),
  { auth: true, limit: { key: "like", max: 60, windowMs: 60_000 } },
);
