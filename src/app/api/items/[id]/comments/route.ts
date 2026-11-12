import { route, readJson, ok } from "@/lib/api";
import { addComment, listComments } from "@/lib/services/social";
import { commentSchema } from "@/lib/validation";

export const GET = route<{ id: string }>(async ({ user, params }) => ok(await listComments(params.id, user?.id)));

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { body } = commentSchema.parse(await readJson(req));
    const comment = await addComment(user.id, params.id, body);
    return ok({ comment }, 201);
  },
  { auth: true, limit: { key: "comment", max: 30, windowMs: 60_000 } },
);
