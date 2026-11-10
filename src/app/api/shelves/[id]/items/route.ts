import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/env";
import { createLinkItem, createPhotoItem } from "@/lib/services/items";
import { itemCreateLinkSchema, itemTextSchema } from "@/lib/validation";
import { toItemDTO } from "@/lib/mappers";

export const maxDuration = 30;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : undefined);

/** multipart/form-data: type=LINK|PHOTO, title?, description?, url (LINK), imageUrl? / file? (LINK: chosen candidate or own photo), file (PHOTO) */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "Invalid form data");
    }
    const type = str(form.get("type"));
    const text = { title: str(form.get("title")), description: str(form.get("description")) };

    if (type === "LINK") {
      const input = itemCreateLinkSchema.parse({ ...text, url: str(form.get("url")) });
      // Optional: a candidate photo the user picked, or their own photo (takes priority).
      const pick = str(form.get("imageUrl"));
      const own = form.get("file");
      let photo: Buffer | undefined;
      if (own instanceof File && own.size > 0) {
        if (own.size > maxUploadBytes()) throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
        photo = Buffer.from(await own.arrayBuffer());
      }
      const item = await createLinkItem(user.id, params.id, input, { imageUrl: pick && pick.length <= 2000 ? pick : undefined, photo });
      return ok({ item: toItemDTO(item) }, 201);
    }
    if (type === "PHOTO") {
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) throw new AppError("BAD_REQUEST", "Choose a photo to upload");
      if (file.size > maxUploadBytes()) {
        throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
      }
      const input = itemTextSchema.parse(text);
      const item = await createPhotoItem(user.id, params.id, input, Buffer.from(await file.arrayBuffer()));
      return ok({ item: toItemDTO(item) }, 201);
    }
    throw new AppError("BAD_REQUEST", "Item type must be LINK or PHOTO");
  },
  { auth: true, limit: { key: "item-create", max: 60, windowMs: 60_000 } },
);
