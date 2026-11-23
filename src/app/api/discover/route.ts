import { route, ok } from "@/lib/api";
import { discoverRail } from "@/lib/services/discovery";

/** Explore's discovery rail: topic chips, trending collections and people you might like. Public data only. */
export const GET = route(async ({ user }) => ok(await discoverRail(user?.id ?? null)), { limit: { key: "discover", max: 120, windowMs: 60_000 } });
