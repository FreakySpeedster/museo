import { route, ok } from "@/lib/api";
import { unreadCount } from "@/lib/services/notifications";

export const GET = route(async ({ user }) => ok({ count: user ? await unreadCount(user.id) : 0 }));
