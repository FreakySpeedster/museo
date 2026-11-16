import { route, ok } from "@/lib/api";
import { listNotifications } from "@/lib/services/notifications";

export const GET = route(
  async ({ req, user }) => ok(await listNotifications(user.id, req.nextUrl.searchParams.get("cursor"))),
  { auth: true },
);
