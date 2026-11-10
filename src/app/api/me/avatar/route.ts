import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/env";
import { removeAvatar, setAvatar } from "@/lib/services/accounts";
import { toViewerDTO } from "@/lib/mappers";

export const maxDuration = 30;

/** multipart/form-data: file = image. Replaces the current avatar. */
export const POST = route(
  async ({ req, user }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "Invalid form data");
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("BAD_REQUEST", "Choose a photo to upload");
    if (file.size > maxUploadBytes()) {
      throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
    }
    const updated = await setAvatar(user.id, Buffer.from(await file.arrayBuffer()));
    return ok({ user: toViewerDTO(updated) });
  },
  { auth: true, limit: { key: "avatar", max: 20, windowMs: 60_000 } },
);

export const DELETE = route(
  async ({ user }) => ok({ user: toViewerDTO(await removeAvatar(user.id)) }),
  { auth: true, limit: { key: "avatar", max: 20, windowMs: 60_000 } },
);
