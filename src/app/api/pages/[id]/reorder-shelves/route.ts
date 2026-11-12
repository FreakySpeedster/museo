import { route, readJson, ok } from "@/lib/api";
import { reorderShelves } from "@/lib/services/pages";
import { reorderShelvesSchema } from "@/lib/validation";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { shelfIds } = reorderShelvesSchema.parse(await readJson(req));
    await reorderShelves(user.id, params.id, shelfIds);
    return ok({ ok: true });
  },
  { auth: true },
);
