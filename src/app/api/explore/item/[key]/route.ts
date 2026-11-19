import { after } from "next/server";
import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { isCanonicalKey } from "@/lib/canonical";
import { exploreItemPosts } from "@/lib/services/explore";
import { backfillItemMeta } from "@/lib/services/feed";

/** Posts of one thing from every owner (paged). */
export const GET = route<{ key: string }>(
  async ({ req, user, params }) => {
    if (!isCanonicalKey(params.key)) throw new AppError("NOT_FOUND", "Nothing here");
    const offset = Math.min(Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0, 2000);
    const res = await exploreItemPosts(params.key, user?.id, offset);
    after(() => backfillItemMeta(res.items.filter((i) => i.imageWidth == null)));
    return ok(res);
  },
  { limit: { key: "explore-item", max: 90, windowMs: 60_000 } },
);
