import { route, readJson, ok } from "@/lib/api";
import { createShelf } from "@/lib/services/shelves";
import { shelfSchema } from "@/lib/validation";
import { toShelfDTO } from "@/lib/mappers";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const input = shelfSchema.parse(await readJson(req));
    return ok({ shelf: toShelfDTO(await createShelf(user.id, params.id, input)) }, 201);
  },
  { auth: true },
);
