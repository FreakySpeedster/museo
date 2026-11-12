import { route, ok } from "@/lib/api";
import { searchPage, searchPreview } from "@/lib/services/search";
import { searchQuerySchema } from "@/lib/validation";

export const GET = route(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const q = searchQuerySchema.parse({
    q: sp.get("q") ?? "",
    type: sp.get("type") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    cursor: sp.get("cursor") ?? undefined,
  });
  if (sp.get("preview") === "1") {
    return ok({ items: await searchPreview(q.q, q.limit) });
  }
  return ok(await searchPage(q.q, q.type, q.sort, q.cursor));
}, { limit: { key: "search", max: 60, windowMs: 60_000 } });
