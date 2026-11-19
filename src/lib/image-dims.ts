import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { LOCAL_NAME_RE, LOCAL_URL_PREFIX, isBlobUrl, storeRead } from "./storage";

export interface Dims {
  width: number;
  height: number;
}

/** Read the pixel size of one of our own stored images (local / database / Vercel Blob only, never arbitrary hosts). */
export async function probeImageDims(url: string | null | undefined): Promise<Dims | null> {
  if (!url) return null;
  try {
    let buf: Buffer | null = null;
    if (url.startsWith(LOCAL_URL_PREFIX)) {
      const name = url.slice(LOCAL_URL_PREFIX.length);
      if (!LOCAL_NAME_RE.test(name)) return null;
      buf = (await storeRead(name))?.data ?? null;
    } else if (/^\/seed\/[a-z0-9-]+\.(svg|png|jpe?g|webp)$/i.test(url)) {
      buf = await fs.readFile(path.join(process.cwd(), "public", url));
    } else if (isBlobUrl(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    }
    if (!buf) return null;
    const m = await sharp(buf, { limitInputPixels: 60e6 }).metadata();
    const width = m.width ?? 0;
    const height = m.pageHeight ?? m.height ?? 0;
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}
