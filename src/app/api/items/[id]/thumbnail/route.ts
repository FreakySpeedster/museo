import { route, ok, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/env";
import { itemThumbnailOptions, refreshItemThumbnail, setItemPhoto, type ThumbnailMode } from "@/lib/services/items";
import { toItemDTO } from "@/lib/mappers";

export const maxDuration = 60;

/** Owner-only: verified candidate images for the "pick a different photo" picker. */
export const GET = route<{ id: string }>(async ({ user, params }) => ok(await itemThumbnailOptions(user.id, params.id)), {
  auth: true,
  limit: { key: "thumb-options", max: 20, windowMs: 60_000 },
});

/**
 * Owner-only. JSON `{ mode: "missing" | "auto" | "candidate", imageUrl? }` re-runs link extraction (auto = also "revert to the link
 * photo"); multipart with `file` replaces the picture with the owner's own photo.
 */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File) || file.size === 0) throw new AppError("BAD_REQUEST", "Choose a photo to upload");
      if (file.size > maxUploadBytes()) throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
      return ok({ item: toItemDTO(await setItemPhoto(user.id, params.id, Buffer.from(await file.arrayBuffer()))) });
    }
    const body = req.headers.get("content-length") === "0" ? {} : ((await readJson(req).catch(() => ({}))) as { mode?: string; imageUrl?: unknown });
    const mode: ThumbnailMode = body.mode === "auto" || body.mode === "candidate" ? body.mode : "missing";
    const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.length <= 2000 ? body.imageUrl : undefined;
    return ok({ item: toItemDTO(await refreshItemThumbnail(params.id, { userId: user.id, mode, imageUrl })) });
  },
  { auth: true, limit: { key: "thumb-refresh", max: 30, windowMs: 60_000 } },
);
