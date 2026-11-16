import { route, ok } from "@/lib/api";
import { markAllRead } from "@/lib/services/notifications";

export const POST = route(
  async ({ user }) => {
    await markAllRead(user.id);
    return ok({ ok: true });
  },
  { auth: true },
);
