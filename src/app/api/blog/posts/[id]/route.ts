import { route, readJson, ok } from "@/lib/api";
import { deletePost, getPost, updatePost } from "@/lib/services/blog";
import { blogPostUpdateSchema } from "@/lib/validation";

export const GET = route<{ id: string }>(async ({ user, params }) => ok({ post: await getPost(params.id, user?.id) }));

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const input = blogPostUpdateSchema.parse(await readJson(req));
    const post = await updatePost(user.id, params.id, input);
    return ok({ post: { id: post.id, status: post.status } });
  },
  { auth: true, limit: { key: "blog-write", max: 30, windowMs: 60_000 } },
);

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    await deletePost(user.id, params.id);
    return ok({ ok: true });
  },
  { auth: true },
);
