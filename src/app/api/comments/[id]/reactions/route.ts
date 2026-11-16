import { route, readJson, ok } from "@/lib/api";
import { toggleReaction } from "@/lib/services/social";
import { reactionSchema } from "@/lib/validation";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { emoji } = reactionSchema.parse(await readJson(req));
    return ok({ comment: await toggleReaction(user.id, params.id, emoji) });
  },
  { auth: true, limit: { key: "reaction", max: 60, windowMs: 60_000 } },
);
