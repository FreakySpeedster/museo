/**
 * Serverless platforms cap request bodies (Vercel: 4.5 MB). Large photos are downscaled in the browser
 * before upload (max 2400px, WebP/JPEG) so phone photos of 6–8 MB still go through.
 */
export const MAX_REQUEST_BYTES = 4.2 * 1024 * 1024;
const SHRINK_ABOVE = 3.5 * 1024 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.size <= SHRINK_ABOVE) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    for (const [type, q] of [["image/webp", 0.85], ["image/jpeg", 0.8], ["image/jpeg", 0.65]] as const) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
      if (blob && blob.type === type && blob.size < file.size && blob.size <= MAX_REQUEST_BYTES) {
        const ext = type === "image/webp" ? "webp" : "jpg";
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type });
      }
    }
  } catch {
    /* fall through to the original file */
  }
  return file;
}

/** Centre-crop to a square and downscale (default 512px) so avatars stay far below the request limit. */
export async function squareCrop(file: File, size = 512): Promise<File> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = Math.floor((bmp.width - side) / 2);
  const sy = Math.floor((bmp.height - side) / 2);
  const out = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, out, out);
  bmp.close?.();
  for (const [type, q] of [["image/webp", 0.88], ["image/jpeg", 0.85]] as const) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    if (blob && blob.type === type) return new File([blob], `avatar.${type === "image/webp" ? "webp" : "jpg"}`, { type });
  }
  throw new Error("Couldn't process that image");
}
