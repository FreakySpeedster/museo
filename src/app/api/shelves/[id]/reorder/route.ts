import { route, readJson, ok } from "@/lib/api";
import { reorderItems } from "@/lib/services/items";
import { reorderSchema } from "@/lib/validation";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    await reorderItems(user.id, params.id, reorderSchema.parse(await readJson(req)));
    return ok({ ok: true });
  },
  { auth: true },
);
