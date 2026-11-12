import { route, readJson, ok } from "@/lib/api";
import { deleteItem, updateItem } from "@/lib/services/items";
import { itemUpdateSchema } from "@/lib/validation";
import { toItemDTOWithSocial } from "@/lib/services/social";

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const input = itemUpdateSchema.parse(await readJson(req));
    return ok({ item: await toItemDTOWithSocial(await updateItem(user.id, params.id, input), user.id) });
  },
  { auth: true },
);

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    await deleteItem(user.id, params.id);
    return ok({ ok: true });
  },
  { auth: true },
);
