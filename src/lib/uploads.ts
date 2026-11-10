import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "./errors";
import { maxUploadBytes, uploadDir } from "./env";

export const UPLOAD_URL_PREFIX = "/api/uploads/";
export const UPLOAD_NAME_RE = /^[a-f0-9]{32}\.(webp|gif|ico)$/;

type Kind = "jpeg" | "png" | "gif" | "webp" | "ico" | null;

/** Identify an image from its magic bytes — never trust the client's filename or MIME type. */
export function sniffImage(buf: Buffer): Kind {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 6).toString("latin1") === "GIF87a" || buf.subarray(0, 6).toString("latin1") === "GIF89a") return "gif";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "ico";
  return null;
}

const rand = () => crypto.randomBytes(16).toString("hex");

async function write(name: string, data: Buffer) {
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data, { mode: 0o640 });
  return UPLOAD_URL_PREFIX + name;
}

/**
 * Validate + normalise an uploaded image. Raster images are decoded and re-encoded to WebP
 * (resized, auto-rotated, EXIF/GPS metadata stripped). Animated GIFs are kept as-is.
 */
export async function saveUploadedImage(buf: Buffer, opts: { allowIco?: boolean } = {}): Promise<string> {
  if (buf.length === 0) throw new AppError("UPLOAD_INVALID", "That file is empty");
  if (buf.length > maxUploadBytes()) {
    throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
  }
  const kind = sniffImage(buf);
  if (!kind || (kind === "ico" && !opts.allowIco)) {
    throw new AppError("UPLOAD_INVALID", "Only JPG, PNG, WebP or GIF images are allowed");
  }
  if (kind === "gif") {
    // Validate that it decodes, keep original frames.
    try {
      await sharp(buf, { limitInputPixels: 40e6, animated: true }).metadata();
    } catch {
      throw new AppError("UPLOAD_INVALID", "That image looks corrupted");
    }
    return write(`${rand()}.gif`, buf);
  }
  if (kind === "ico") return write(`${rand()}.ico`, buf);
  try {
    const out = await sharp(buf, { limitInputPixels: 60e6 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return write(`${rand()}.webp`, out);
  } catch {
    throw new AppError("UPLOAD_INVALID", "That image looks corrupted or unsupported");
  }
}

/** Save an image that was fetched from a remote site (also allows rasterising SVG/AVIF/ICO). */
export async function saveRemoteImage(buf: Buffer): Promise<string | null> {
  if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return null;
  try {
    const out = await sharp(buf, { limitInputPixels: 60e6 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return await write(`${rand()}.webp`, out);
  } catch {
    if (sniffImage(buf) === "ico") return write(`${rand()}.ico`, buf);
    return null;
  }
}

export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;
  const name = url.slice(UPLOAD_URL_PREFIX.length);
  if (!UPLOAD_NAME_RE.test(name)) return;
  await fs.rm(path.join(uploadDir(), name), { force: true }).catch(() => {});
}
