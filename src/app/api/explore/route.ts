import { route, ok } from "@/lib/api";
import { exploreItems } from "@/lib/services/explore";

export const GET = route(
  async ({ req, user }) => {
    const sp = req.nextUrl.searchParams;
    const chip = (sp.get("chip") ?? "for-you").slice(0, 60);
    const offset = Math.min(Number(sp.get("offset") ?? 0) || 0, 2000);
    return ok(await exploreItems({ viewerId: user?.id, chip, offset }));
  },
  { limit: { key: "explore", max: 90, windowMs: 60_000 } },
);
