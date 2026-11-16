import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/env";
import { createLinkItem, createPhotoItem } from "@/lib/services/items";
import { itemCreateLinkSchema, itemTextSchema } from "@/lib/validation";
import { toItemDTO } from "@/lib/mappers";
import { MAX_MANUAL_PHOTOS } from "@/lib/limits";

export const maxDuration = 30;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : undefined);

/** multipart/form-data: type=LINK|PHOTO, title?, description?, url (LINK), imageUrl? / file? (LINK: chosen candidate or own photo), file (PHOTO, repeatable up to 3) */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "Invalid form data");
    }
    const type = str(form.get("type"));
    const text = { title: str(form.get("title")), description: str(form.get("description")), tags: str(form.get("tags")) };

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
      let extraImageUrls: string[] = [];
      try {
        const raw = JSON.parse(str(form.get("imageUrls")) || "[]");
        if (Array.isArray(raw)) extraImageUrls = raw.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && u.length <= 2000).slice(0, 6);
      } catch {
        /* ignore malformed list */
      }
      const item = await createLinkItem(user.id, params.id, input, { imageUrl: pick && pick.length <= 2000 ? pick : undefined, photo, extraImageUrls });
      return ok({ item: toItemDTO(item) }, 201);
    }
    if (type === "PHOTO") {
      // One or more "file" parts (max 3); the first is the cover.
      const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length === 0) throw new AppError("BAD_REQUEST", "Choose a photo to upload");
      if (files.length > MAX_MANUAL_PHOTOS) throw new AppError("BAD_REQUEST", `Add up to ${MAX_MANUAL_PHOTOS} photos`);
      if (files.some((f) => f.size > maxUploadBytes())) {
        throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
      }
      const input = itemTextSchema.parse(text);
      const buffers = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
      const item = await createPhotoItem(user.id, params.id, input, buffers);
      return ok({ item: toItemDTO(item) }, 201);
    }
    throw new AppError("BAD_REQUEST", "Item type must be LINK or PHOTO");
  },
  { auth: true, limit: { key: "item-create", max: 60, windowMs: 60_000 } },
);
