import { route, ok } from "@/lib/api";
import { listSaved } from "@/lib/services/saves";

/** The signed-in user's own Want list (private; there is no way to read anyone else's). */
export const GET = route(async ({ req, user }) => ok(await listSaved(user.id, req.nextUrl.searchParams.get("cursor"))), { auth: true });
