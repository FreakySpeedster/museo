import { route, ok } from "@/lib/api";
import { setSaved } from "@/lib/services/saves";

const limit = { key: "save", max: 90, windowMs: 60_000 };

/** PUT saves the item to the viewer's private Want list; DELETE removes it. Both are idempotent. */
export const PUT = route<{ id: string }>(async ({ user, params }) => ok(await setSaved(user.id, params.id, true)), { auth: true, limit });
export const DELETE = route<{ id: string }>(async ({ user, params }) => ok(await setSaved(user.id, params.id, false)), { auth: true, limit });
