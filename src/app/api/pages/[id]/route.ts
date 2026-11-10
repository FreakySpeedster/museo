import { route, readJson, ok } from "@/lib/api";
import { deletePage, updatePage } from "@/lib/services/pages";
import { pageUpdateSchema } from "@/lib/validation";
import { toPageDTO } from "@/lib/mappers";

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const input = pageUpdateSchema.parse(await readJson(req));
    return ok({ page: toPageDTO(await updatePage(user.id, params.id, input)) });
  },
  { auth: true },
);

export const DELETE = route<{ id: string }>(
  async ({ user, params }) => {
    await deletePage(user.id, params.id);
    return ok({ ok: true });
  },
  { auth: true },
);
