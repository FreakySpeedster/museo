import { route, ok } from "@/lib/api";
import { listConnections } from "@/lib/services/connections";
import { connectionsQuerySchema } from "@/lib/validation";

/** ?q= searches by username or name; ?cursor= pages (20 at a time). */
export const GET = route<{ username: string }>(
  async ({ req, user, params }) => {
    const { q, cursor } = connectionsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return ok(await listConnections(params.username, "following", user?.id, { q, cursor }));
  },
  { limit: { key: "connections", max: 120, windowMs: 60_000 } },
);
