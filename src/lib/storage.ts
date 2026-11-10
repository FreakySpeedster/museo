import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { db } from "./db";
import { uploadDir } from "./env";

/**
 * Storage adapter for user images, avatars and cached link thumbnails.
 *  - BLOB_READ_WRITE_TOKEN set          -> Vercel Blob (public URLs on *.public.blob.vercel-storage.com)
 *  - on Vercel (or STORAGE_DRIVER=db)   -> compact images kept in the database (Asset table), served by /api/uploads/<name>
 *  - otherwise                          -> local disk under UPLOAD_DIR, served by /api/uploads/<name>
 * Images are always re-encoded to small WebP first, so the database driver stays cheap.
 */
export const LOCAL_URL_PREFIX = "/api/uploads/";
export const LOCAL_NAME_RE = /^[a-f0-9]{32}\.(webp|gif|ico)$/;

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const dbStorageEnabled = () => !blobEnabled() && (Boolean(process.env.VERCEL) || process.env.STORAGE_DRIVER === "db");
export const storageDriver = () => (blobEnabled() ? "vercel-blob" : dbStorageEnabled() ? "database" : "local");

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
  if (dbStorageEnabled()) {
    await db.asset.create({ data: { name, contentType, data: new Uint8Array(data), size: data.length } });
    return LOCAL_URL_PREFIX + name;
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
      if (LOCAL_NAME_RE.test(name)) {
        await db.asset.deleteMany({ where: { name } });
        await fs.rm(path.join(uploadDir(), name), { force: true });
      }
    } else if (blobEnabled() && isBlobUrl(url)) {
      await del(url);
    }
  } catch {
    /* best effort: a leaked file must never fail a user's delete */
  }
}

/** Read an image by name from whichever local-style driver holds it (database first on serverless). */
export async function storeRead(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  const types: Record<string, string> = { webp: "image/webp", gif: "image/gif", ico: "image/x-icon" };
  if (!process.env.VERCEL) {
    try {
      return { data: await fs.readFile(path.join(uploadDir(), name)), contentType: types[name.split(".")[1]] };
    } catch {
      /* fall through to the database */
    }
  }
  const row = await db.asset.findUnique({ where: { name } });
  return row ? { data: Buffer.from(row.data), contentType: row.contentType } : null;
}
