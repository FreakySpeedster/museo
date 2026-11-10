import { decodeHtml, parseMetadata, type PageMetadata } from "./net/og";
import { parsePublicUrl, safeFetch, UnsafeUrlError } from "./net/safe-fetch";
import { saveRemoteImage } from "./uploads";
import { AppError } from "./errors";

export interface LinkPreview extends PageMetadata {
  url: string;
}

/** Fetch a page (SSRF-safe) and extract its metadata. Never throws for unreachable pages — returns a bare preview. */
export async function getLinkPreview(rawUrl: string): Promise<LinkPreview> {
  let url: URL;
  try {
    url = parsePublicUrl(rawUrl);
  } catch (e) {
    throw new AppError("BAD_REQUEST", e instanceof Error ? e.message : "Invalid link");
  }
  const host = url.hostname.replace(/^www\./, "");
  const bare: LinkPreview = {
    url: url.toString(),
    title: "",
    description: "",
    siteName: host,
    image: null,
    favicon: null,
  };
  try {
    const res = await safeFetch(url.toString(), { maxBytes: 1_500_000, timeoutMs: 8000 });
    if (res.status >= 400) return bare;
    if (!/html|xml/i.test(res.contentType)) {
      // A direct link to an image becomes its own thumbnail.
      if (/^image\//i.test(res.contentType)) return { ...bare, url: res.url, image: res.url, title: decodeURIComponent(url.pathname.split("/").pop() || host) };
      return bare;
    }
    const meta = parseMetadata(decodeHtml(res.body, res.contentType), res.url);
    return { ...meta, url: res.url };
  } catch (e) {
    if (e instanceof UnsafeUrlError) {
      // Surface "blocked address" as a user error; swallow network flakiness.
      if (/isn't allowed|Only http|valid link|credentials/.test(e.message)) throw new AppError("BAD_REQUEST", e.message);
    }
    return bare;
  }
}

async function downloadImage(url: string): Promise<string | null> {
  try {
    const res = await safeFetch(url, {
      maxBytes: 6 * 1024 * 1024,
      timeoutMs: 8000,
      accept: "image/avif,image/webp,image/*;q=0.8",
      contentTypeFilter: /^(image\/|application\/octet-stream)/i,
    });
    if (res.status >= 400 || res.truncated) return null;
    return await saveRemoteImage(res.body);
  } catch {
    return null;
  }
}

/** Cache a preview's thumbnail locally so cards never break when the source site changes. */
export async function resolveThumbnail(preview: LinkPreview): Promise<{ imageUrl: string | null; faviconUrl: string | null }> {
  let imageUrl: string | null = null;
  if (preview.image) imageUrl = await downloadImage(preview.image);
  let faviconUrl: string | null = null;
  if (preview.favicon) faviconUrl = await downloadImage(preview.favicon);
  return { imageUrl, faviconUrl };
}
