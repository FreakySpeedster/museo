import { route, ok } from "@/lib/api";
import { postsForItem } from "@/lib/services/blog";

/** Published blog posts that tag this item. */
export const GET = route<{ id: string }>(async ({ user, params }) => ok({ posts: await postsForItem(params.id, user?.id) }));
