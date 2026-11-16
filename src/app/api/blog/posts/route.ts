import { route, readJson, ok } from "@/lib/api";
import { createPost, listPosts } from "@/lib/services/blog";
import { blogListQuerySchema, blogPostSchema } from "@/lib/validation";

export const GET = route(async ({ req, user }) => {
  const q = blogListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await listPosts({ author: q.author, mine: q.mine === "1", viewerId: user?.id, cursor: q.cursor }));
});

export const POST = route(
  async ({ req, user }) => {
    const input = blogPostSchema.parse(await readJson(req));
    const post = await createPost(user.id, input);
    return ok({ post: { id: post.id, status: post.status } }, 201);
  },
  { auth: true, limit: { key: "blog-write", max: 30, windowMs: 60_000 } },
);
