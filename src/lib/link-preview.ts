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
    imageCandidates: [],
    favicon: null,
  };
  try {
    const res = await safeFetch(url.toString(), { maxBytes: 1_500_000, timeoutMs: 8000 });
    if (res.status >= 400) return bare;
    if (!/html|xml/i.test(res.contentType)) {
      // A direct link to an image becomes its own thumbnail.
      if (/^image\//i.test(res.contentType)) return { ...bare, url: res.url, image: res.url, imageCandidates: [res.url], title: decodeURIComponent(url.pathname.split("/").pop() || host) };
      return bare;
    }
    const meta = parseMetadata(decodeHtml(res.body, res.contentType), res.url);
    const preview: LinkPreview = { ...meta, url: res.url };
    // Shopify storefronts expose the product image as JSON even when the page has no usable og:image.
    if (!preview.imageCandidates.length || /\/products\/[^/]+\/?$/.test(new URL(res.url).pathname)) {
      const extra = await shopifyImage(res.url);
      if (extra) {
        preview.imageCandidates = [...preview.imageCandidates.slice(0, 3), extra, ...preview.imageCandidates.slice(3)].filter((v, i, a) => a.indexOf(v) === i);
        preview.image = preview.image ?? extra;
      }
    }
    return preview;
  } catch (e) {
    if (e instanceof UnsafeUrlError) {
      // Surface "blocked address" as a user error; swallow network flakiness.
      if (/isn't allowed|Only http|valid link|credentials/.test(e.message)) throw new AppError("BAD_REQUEST", e.message);
    }
    return bare;
  }
}

async function shopifyImage(pageUrl: string): Promise<string | null> {
  try {
    const u = new URL(pageUrl);
    const m = /^(\/products\/[^/]+)\/?$/.exec(u.pathname);
    if (!m) return null;
    const res = await safeFetch(`${u.origin}${m[1]}.json`, { maxBytes: 600_000, timeoutMs: 5000, accept: "application/json" });
    if (res.status >= 400 || !/json/i.test(res.contentType)) return null;
    const j = JSON.parse(res.body.toString("utf8")) as { product?: { image?: { src?: string }; images?: Array<{ src?: string }> } };
    const src = j.product?.image?.src ?? j.product?.images?.[0]?.src;
    return src && /^https?:\/\//.test(src) ? src : null;
  } catch {
    return null;
  }
}

async function downloadImage(url: string, referer?: string): Promise<string | null> {
  try {
    const res = await safeFetch(url, {
      maxBytes: 6 * 1024 * 1024,
      timeoutMs: 8000,
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      headers: referer ? { referer } : undefined,
      contentTypeFilter: /^(image\/|application\/octet-stream)/i,
    });
    if (res.status >= 400 || res.truncated) return null;
    return await saveRemoteImage(res.body);
  } catch {
    return null;
  }
}

/** A remote image URL that is safe to hand to an <img> tag if we cannot cache it ourselves. */
function remoteFallback(url: string | null | undefined): string | null {
  if (!url || url.length > 1000) return null;
  try {
    const u = new URL(url);
    if (u.protocol === "http:") u.protocol = "https:"; // avoid mixed-content blocks
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Cache the best thumbnail (re-encoded, small) via the storage adapter. If caching fails for every candidate,
 * keep the remote https URL so cards still show the real picture instead of a placeholder.
 */
export async function resolveThumbnail(preview: LinkPreview): Promise<{ imageUrl: string | null; faviconUrl: string | null }> {
  const candidates = (preview.imageCandidates.length ? preview.imageCandidates : preview.image ? [preview.image] : []).slice(0, 4);
  let referer: string | undefined;
  try {
    referer = new URL(preview.url).origin + "/";
  } catch {
    /* ignore */
  }
  let imageUrl: string | null = null;
  for (const c of candidates) {
    imageUrl = await downloadImage(c, referer);
    if (imageUrl) break;
  }
  if (!imageUrl) imageUrl = remoteFallback(candidates[0]);
  let faviconUrl: string | null = null;
  if (preview.favicon) faviconUrl = (await downloadImage(preview.favicon, referer)) ?? null;
  return { imageUrl, faviconUrl };
}

/** Re-run the preview for a stored link and fill in a missing thumbnail/favicon. Returns true if anything changed. */
export async function refreshLinkThumbnail(url: string): Promise<{ imageUrl: string | null; faviconUrl: string | null }> {
  const preview = await getLinkPreview(url);
  return resolveThumbnail(preview);
}
