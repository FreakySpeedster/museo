import { route, ok } from "@/lib/api";
import { searchTaggableItems, tagItemsByIds } from "@/lib/services/blog";

/** Items to tag in a post: ?q=&scope=mine|all, or ?ids=a,b to hydrate a selection. */
export const GET = route(
  async ({ req, user }) => {
    const sp = req.nextUrl.searchParams;
    const ids = sp.get("ids");
    if (ids) return ok({ items: await tagItemsByIds(user.id, ids.split(",").filter(Boolean).slice(0, 12)) });
    const scope = sp.get("scope") === "all" ? "all" : "mine";
    return ok({ items: await searchTaggableItems(user.id, (sp.get("q") ?? "").slice(0, 80), scope) });
  },
  { auth: true, limit: { key: "blog-items", max: 120, windowMs: 60_000 } },
);
