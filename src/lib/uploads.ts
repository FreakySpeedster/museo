import crypto from "node:crypto";
import sharp from "sharp";
import { AppError } from "./errors";
import { maxUploadBytes } from "./env";
import { LOCAL_NAME_RE, LOCAL_URL_PREFIX, storeDelete, storePut } from "./storage";

export const UPLOAD_URL_PREFIX = LOCAL_URL_PREFIX;
export const UPLOAD_NAME_RE = LOCAL_NAME_RE;

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

const MIME = { webp: "image/webp", gif: "image/gif", ico: "image/x-icon" } as const;
const write = (name: string, data: Buffer) => storePut(name, data, MIME[name.split(".")[1] as keyof typeof MIME]);

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
      .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return await write(`${rand()}.webp`, out);
  } catch {
    if (sniffImage(buf) === "ico") return write(`${rand()}.ico`, buf);
    return null;
  }
}

/** Validate an avatar upload and store it as a 512x512 square WebP (centre-cropped, metadata stripped). */
export async function saveAvatar(buf: Buffer): Promise<string> {
  if (buf.length === 0) throw new AppError("UPLOAD_INVALID", "That file is empty");
  if (buf.length > maxUploadBytes()) {
    throw new AppError("UPLOAD_INVALID", `Image is too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)`);
  }
  const kind = sniffImage(buf);
  if (!kind || kind === "ico") throw new AppError("UPLOAD_INVALID", "Only JPG, PNG, WebP or GIF images are allowed");
  try {
    const out = await sharp(buf, { limitInputPixels: 60e6 })
      .rotate()
      .resize({ width: 512, height: 512, fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return await write(`${rand()}.webp`, out);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("UPLOAD_INVALID", "That image looks corrupted or unsupported");
  }
}

export const deleteUploadByUrl = storeDelete;
