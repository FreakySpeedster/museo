import { NextResponse } from "next/server";
import sharp from "sharp";
import { route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { safeFetch, UnsafeUrlError } from "@/lib/net/safe-fetch";

export const maxDuration = 20;

/**
 * Same-origin, SSRF-guarded thumbnail proxy for the add form: remote shops often block hot-linking, so the candidate
 * photos are fetched server-side (with a referer), downscaled to 480px WebP and cached by the browser.
 */
export const GET = route(
  async ({ req }) => {
    const raw = new URL(req.url).searchParams.get("url") ?? "";
    if (!raw || raw.length > 2000) throw new AppError("BAD_REQUEST", "Image url is required");
    let origin: string | undefined;
    try {
      origin = new URL(raw).origin + "/";
    } catch {
      throw new AppError("BAD_REQUEST", "Invalid image url");
    }
    const fetchOnce = (headers?: Record<string, string>) =>
      safeFetch(raw, { maxBytes: 6 * 1024 * 1024, timeoutMs: 7000, accept: "image/avif,image/webp,image/*,*/*;q=0.8", headers, contentTypeFilter: /^(image\/|application\/octet-stream|binary\/)/i });
    try {
      let res = await fetchOnce({ referer: origin });
      if (res.status >= 400) res = await fetchOnce();
      if (res.status >= 400 || res.truncated) throw new AppError("NOT_FOUND", "Image not available");
      const out = await sharp(res.body, { limitInputPixels: 80e6 }).rotate().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
      return new NextResponse(new Uint8Array(out), {
        headers: { "content-type": "image/webp", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox" },
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e instanceof UnsafeUrlError) throw new AppError("BAD_REQUEST", e.message);
      throw new AppError("NOT_FOUND", "Image not available");
    }
  },
  { auth: true, limit: { key: "preview-image", max: 240, windowMs: 60_000 } },
);
