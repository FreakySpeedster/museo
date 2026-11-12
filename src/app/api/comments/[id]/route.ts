import { route, ok } from "@/lib/api";
import { deleteComment } from "@/lib/services/social";

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    await deleteComment(user.id, params.id);
    return ok({ ok: true });
  },
  { auth: true, limit: { key: "comment-del", max: 30, windowMs: 60_000 } },
);
