import { route, readJson, ok } from "@/lib/api";
import { moveShelfToPage } from "@/lib/services/shelves";
import { shelfMoveSchema } from "@/lib/validation";
import { toShelfDTO } from "@/lib/mappers";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { pageId } = shelfMoveSchema.parse(await readJson(req));
    return ok({ shelf: toShelfDTO(await moveShelfToPage(user.id, params.id, pageId)) });
  },
  { auth: true },
);
