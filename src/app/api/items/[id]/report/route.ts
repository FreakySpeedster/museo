import { route, readJson, ok } from "@/lib/api";
import { reportItemLink } from "@/lib/services/items";
import { reportSchema } from "@/lib/validation";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { reason } = reportSchema.parse(await readJson(req));
    return ok(await reportItemLink(user.id, params.id, reason));
  },
  { auth: true, limit: { key: "item-report", max: 20, windowMs: 60 * 60_000 } },
);
