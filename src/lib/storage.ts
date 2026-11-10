import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { AppError } from "./errors";
import { uploadDir } from "./env";

/**
 * Storage adapter for user images and cached link thumbnails.
 *  - BLOB_READ_WRITE_TOKEN set  → Vercel Blob (public URLs on *.public.blob.vercel-storage.com)
 *  - otherwise                  → local disk under UPLOAD_DIR, served by /api/uploads/<name>
 */
export const LOCAL_URL_PREFIX = "/api/uploads/";
export const LOCAL_NAME_RE = /^[a-f0-9]{32}\.(webp|gif|ico)$/;

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const storageDriver = () => (blobEnabled() ? "vercel-blob" : "local");

const isBlobUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /\.blob\.vercel-storage\.com$/.test(u.hostname);
  } catch {
    return false;
  }
};

export async function storePut(name: string, data: Buffer, contentType: string): Promise<string> {
  if (blobEnabled()) {
    const res = await put(`uploads/${name}`, data, { access: "public", contentType, addRandomSuffix: false });
    return res.url;
  }
  if (process.env.VERCEL) {
    throw new AppError("UNPROCESSABLE", "File storage isn't configured on this deployment (set BLOB_READ_WRITE_TOKEN).");
  }
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data, { mode: 0o640 });
  return LOCAL_URL_PREFIX + name;
}

export async function storeDelete(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith(LOCAL_URL_PREFIX)) {
      const name = url.slice(LOCAL_URL_PREFIX.length);
      if (LOCAL_NAME_RE.test(name)) await fs.rm(path.join(uploadDir(), name), { force: true });
    } else if (blobEnabled() && isBlobUrl(url)) {
      await del(url);
    }
  } catch {
    /* best effort: a leaked file must never fail a user's delete */
  }
}
