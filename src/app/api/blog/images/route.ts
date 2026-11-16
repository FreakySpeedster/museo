import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/env";
import { uploadBlogImage } from "@/lib/services/blog";

export const maxDuration = 30;

/** multipart/form-data: file. Returns the stored image URL for the editor. nook Plus only. */
export const POST = route(
  async ({ req, user }) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "Invalid form data");
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("BAD_REQUEST", "Choose an image to upload");
    if (file.size > maxUploadBytes()) throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
    const url = await uploadBlogImage(user.id, Buffer.from(await file.arrayBuffer()));
    return ok({ url }, 201);
  },
  { auth: true, limit: { key: "blog-image", max: 30, windowMs: 60_000 } },
);
