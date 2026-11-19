import { route, readJson, ok } from "@/lib/api";
import { collectItem, collectSchema, collectTargets } from "@/lib/services/collect";

/** The viewer's collections for the "Add to my collection" sheet. */
export const GET = route<{ id: string }>(async ({ user, params }) => ok(await collectTargets(user.id, params.id)), { auth: true });

/** Copy the item into one of the viewer's collections (or a new one). */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => ok(await collectItem(user.id, params.id, collectSchema.parse(await readJson(req))), 201),
  { auth: true, limit: { key: "collect", max: 30, windowMs: 60_000 } },
);
