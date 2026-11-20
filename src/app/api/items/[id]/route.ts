import { route, readJson, ok } from "@/lib/api";
import { deleteItem, updateItem, updateItemUrl } from "@/lib/services/items";
import { itemUpdateSchema } from "@/lib/validation";
import { toItemDTOWithSocial } from "@/lib/services/social";

export const maxDuration = 30;

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const { url, ...rest } = itemUpdateSchema.parse(await readJson(req));
    // A new link goes through the same safety gate as posting, then re-fetches the photo / source / title.
    const changed = url !== undefined && (await updateItemUrl(user.id, params.id, url, { title: rest.title })).changed;
    // When the link changed, updateItemUrl already settled the title (owner's or the new page's).
    const fields = changed ? { ...rest, title: undefined } : rest;
    return ok({ item: await toItemDTOWithSocial(await updateItem(user.id, params.id, fields), user.id) });
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
