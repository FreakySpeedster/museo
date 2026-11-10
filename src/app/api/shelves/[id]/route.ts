import { route, readJson, ok } from "@/lib/api";
import { deleteShelf, updateShelf } from "@/lib/services/shelves";
import { shelfUpdateSchema } from "@/lib/validation";
import { toShelfDTO } from "@/lib/mappers";

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const input = shelfUpdateSchema.parse(await readJson(req));
    return ok({ shelf: toShelfDTO(await updateShelf(user.id, params.id, input)) });
  },
  { auth: true },
);

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    await deleteShelf(user.id, params.id);
    return ok({ ok: true });
  },
  { auth: true },
);
