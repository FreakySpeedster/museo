import sharp from "sharp";
import {
  cleanImageUrl,
  decodeHtml,
  headOf,
  isBlockPageTitle,
  imageKey,
  looksLikeIcon,
  oembedCandidates,
  parseMetadata,
  urlCandidates,
  type ImageCandidate,
  type PageMetadata,
} from "./net/og";
import { CHROME_UA, parsePublicUrl, safeFetch, UnsafeUrlError } from "./net/safe-fetch";
import { saveRemoteImage } from "./uploads";
import { AppError } from "./errors";

export interface VerifiedImage extends ImageCandidate {
  width: number;
  height: number;
  /** Final rank after the image was downloaded and measured. */
  rank: number;
  /** Small inline WebP data URI so the add form can show the picture instantly (no hot-linking, no extra requests). */
  thumb?: string;
}

export interface LinkPreview extends PageMetadata {
  url: string;
  /** Which fetch identity produced the page (debug / tests). */
  fetchedAs: string | null;
}

export interface ResolvedPreview {
  preview: LinkPreview;
  /** Best verified image (what WhatsApp would show, but guaranteed to load and be large). */
  best: VerifiedImage | null;
  /** Other verified, reasonably large candidates for the picker (best excluded). */
  alternatives: VerifiedImage[];
}

/* ------------------------------------------------------------ fetch chain */
export const UA_CHAIN: Array<{ name: string; ua: string }> = [
  { name: "whatsapp", ua: "WhatsApp/2.23.20.0 A" },
  { name: "facebook", ua: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" },
  { name: "twitter", ua: "Twitterbot/1.0" },
  { name: "slack", ua: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" },
  { name: "chrome", ua: CHROME_UA },
];

const STRONG = new Set(["og", "twitter", "site", "jsonld"]);
const hasStrong = (c: ImageCandidate[]) => c.some((x) => STRONG.has(x.source) && !looksLikeIcon(x.url));

function emptyPreview(url: string, host: string): LinkPreview {
  return {
    url,
    title: "",
    description: "",
    siteName: host,
    image: null,
    imageCandidates: [],
    favicon: null,
    oembedUrl: null,
    ampUrl: null,
    canonicalUrl: null,
    fetchedAs: null,
  };
}

function mergeCandidates(into: Map<string, ImageCandidate>, list: ImageCandidate[]) {
  for (const c of list) {
    const k = imageKey(c.url);
    const prev = into.get(k);
    if (!prev || c.score > prev.score) into.set(k, { ...c, width: c.width ?? prev?.width, height: c.height ?? prev?.height });
  }
}

async function getJson(url: string, timeoutMs = 5000): Promise<unknown | null> {
  try {
    const res = await safeFetch(url, { maxBytes: 800_000, timeoutMs, accept: "application/json,*/*;q=0.5" });
    if (res.status >= 400) return null;
    return JSON.parse(res.body.toString("utf8"));
  } catch {
    return null;
  }
}

async function shopifyCandidates(pageUrl: string): Promise<ImageCandidate[]> {
  try {
    const u = new URL(pageUrl);
    const m = /^(\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[^/?#]+)\/?$/i.exec(u.pathname);
    if (!m) return [];
    const j = (await getJson(`${u.origin}${m[1]}.json`)) as { product?: { image?: { src?: string }; images?: Array<{ src?: string; width?: number; height?: number }> } } | null;
    const imgs = j?.product?.images?.length ? j.product.images : j?.product?.image ? [j.product.image] : [];
    const out: ImageCandidate[] = [];
    imgs.slice(0, 6).forEach((im, i) => {
      const url = cleanImageUrl(im.src, pageUrl);
      if (url) out.push({ url, source: "site", score: 84 - i, width: (im as { width?: number }).width, height: (im as { height?: number }).height });
    });
    return out;
  } catch {
    return [];
  }
}

/** Free, keyless last resort (a headless-browser unfurler) for sites that wall off every crawler identity. */
async function unfurlFallback(url: string): Promise<{ title?: string; description?: string; image?: string } | null> {
  const j = (await getJson(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, 12_000)) as { status?: string; data?: { title?: string; description?: string; image?: { url?: string } } } | null;
  if (j?.status !== "success" || !j.data) return null;
  return { title: j.data.title, description: j.data.description, image: j.data.image?.url };
}

interface FetchedPage {
  preview: LinkPreview;
  candidates: Map<string, ImageCandidate>;
}

/** Walk the identities (WhatsApp, Facebook, Twitter, Slack, Chrome) and the follow-ups, merging every candidate found. */
async function gatherPage(rawUrl: string, opts: { deadlineMs: number }): Promise<FetchedPage> {
  const url = parsePublicUrl(rawUrl);
  const host = url.hostname.replace(/^www\./, "");
  const started = Date.now();
  const left = () => opts.deadlineMs - (Date.now() - started);
  let preview = emptyPreview(url.toString(), host);
  const cands = new Map<string, ImageCandidate>();
  mergeCandidates(cands, urlCandidates(url.toString()));
  let finalUrl = url.toString();
  let gotPage = false;

  for (const { name, ua } of UA_CHAIN) {
    if (left() < 2500) break;
    try {
      const res = await safeFetch(url.toString(), { maxBytes: 1_800_000, timeoutMs: Math.min(7000, left()), userAgent: ua });
      if (res.status >= 400) continue;
      if (!/html|xml/i.test(res.contentType)) {
        if (/^image\//i.test(res.contentType)) {
          mergeCandidates(cands, [{ url: res.url, source: "og", score: 100 }]);
          preview = { ...preview, url: res.url, title: decodeURIComponent(url.pathname.split("/").pop() || host), fetchedAs: name };
          gotPage = true;
          break;
        }
        continue;
      }
      const html = decodeHtml(res.body, res.contentType);
      // Social crawlers only read the head; body-level hooks are applied on top of it.
      const meta = parseMetadata(html, res.url);
      const headMeta = html.length > 400_000 ? parseMetadata(headOf(html), res.url) : meta;
      const merged = meta.imageCandidates.length >= headMeta.imageCandidates.length ? meta : headMeta;
      const botWalled = (!meta.title && !meta.imageCandidates.length) || (isBlockPageTitle(meta.title) && !hasStrong(meta.imageCandidates));
      if (botWalled) continue;
      if (!gotPage) {
        finalUrl = res.url;
        preview = { ...preview, ...meta, url: res.url, fetchedAs: name, imageCandidates: [], image: null };
        gotPage = true;
      } else {
        // fill gaps from later identities
        preview.title ||= meta.title;
        preview.description ||= meta.description;
        preview.favicon ||= meta.favicon;
        preview.oembedUrl ||= meta.oembedUrl;
        preview.ampUrl ||= meta.ampUrl;
        preview.canonicalUrl ||= meta.canonicalUrl;
        if (!preview.siteName || preview.siteName === host) preview.siteName = meta.siteName || preview.siteName;
      }
      mergeCandidates(cands, merged.imageCandidates);
      if (hasStrong([...cands.values()]) && preview.title) break;
    } catch (e) {
      if (e instanceof UnsafeUrlError && /isn't allowed|Only http|valid link|credentials|find that website/.test(e.message)) throw e;
    }
  }

  const strong = () => hasStrong([...cands.values()]);

  // Follow-ups, cheapest first, only while we still lack a trustworthy image.
  const shopify = await shopifyCandidates(finalUrl);
  mergeCandidates(cands, shopify);

  if (!strong() && left() > 2500) {
    const oembed = preview.oembedUrl ?? (/youtu/.test(host) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(finalUrl)}` : null);
    if (oembed) {
      const j = await getJson(oembed);
      mergeCandidates(cands, oembedCandidates(j, finalUrl));
      const t = (j as { title?: string } | null)?.title;
      if (t && !preview.title) preview.title = String(t).slice(0, 120);
    }
  }
  if (!strong() && preview.ampUrl && left() > 3000) {
    try {
      const res = await safeFetch(preview.ampUrl, { maxBytes: 1_500_000, timeoutMs: Math.min(6000, left()), userAgent: UA_CHAIN[0].ua });
      if (res.status < 400 && /html/i.test(res.contentType)) {
        const amp = parseMetadata(decodeHtml(res.body, res.contentType), res.url);
        mergeCandidates(cands, amp.imageCandidates.map((c) => ({ ...c, source: c.source === "body" ? "body" : "amp", score: Math.min(c.score, 70) })));
        preview.title ||= amp.title;
      }
    } catch {
      /* ignore */
    }
  }
  if (!strong() && !gotPage && left() > 4000) {
    // noembed.com: free oEmbed aggregator (no key); only sees the public URL.
    const j = await getJson(`https://noembed.com/embed?url=${encodeURIComponent(finalUrl)}`);
    mergeCandidates(cands, oembedCandidates(j, finalUrl));
    const t = (j as { title?: string } | null)?.title;
    if (t && !preview.title) preview.title = String(t).slice(0, 120);
  }
  if (!strong() && left() > 5000) {
    const u = await unfurlFallback(finalUrl);
    if (u) {
      if (u.image) mergeCandidates(cands, [{ url: cleanImageUrl(u.image, finalUrl) ?? u.image, source: "oembed", score: 74 }]);
      preview.title ||= (u.title ?? "").slice(0, 120);
      preview.description ||= (u.description ?? "").slice(0, 500);
      preview.fetchedAs ??= "unfurl";
    }
  }

  const ranked = [...cands.values()].sort((a, b) => b.score - a.score);
  preview.imageCandidates = ranked;
  preview.image = ranked[0]?.url ?? null;
  return { preview, candidates: cands };
}

/* ------------------------------------------------------- image validation */
async function fetchImageBuffer(url: string, referer?: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const attempt = async (headers?: Record<string, string>, ua?: string) => {
    try {
      const res = await safeFetch(url, {
        maxBytes: 6 * 1024 * 1024,
        timeoutMs: 7000,
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        headers,
        userAgent: ua,
        contentTypeFilter: /^(image\/|application\/octet-stream|binary\/)/i,
      });
      if (res.status >= 400 || res.truncated || res.body.length < 200) return null;
      return { buf: res.body, contentType: res.contentType };
    } catch {
      return null;
    }
  };
  return (await attempt(referer ? { referer } : undefined)) ?? (await attempt(undefined, UA_CHAIN[0].ua));
}

export function rankMeasured(c: ImageCandidate, w: number, h: number, format?: string): number {
  let rank = c.score;
  const min = Math.min(w, h);
  if (min < 120) rank -= 100;
  else if (min < 200) rank -= 70;
  else if (min < 300) rank -= 12;
  if (format === "svg" || format === "ico") rank -= 60;
  const ratio = w / h;
  if (ratio > 3 || ratio < 0.33) rank -= 30;
  rank += Math.min(8, Math.floor((w * h) / 250_000));
  return rank;
}

async function measure(c: ImageCandidate, referer?: string): Promise<{ v: VerifiedImage; buf: Buffer } | null> {
  const got = await fetchImageBuffer(c.url, referer);
  if (!got) return null;
  try {
    const m = await sharp(got.buf, { limitInputPixels: 80e6 }).metadata();
    if (!m.width || !m.height) return null;
    return { v: { ...c, width: m.width, height: m.height, rank: rankMeasured(c, m.width, m.height, m.format) }, buf: got.buf };
  } catch {
    return null;
  }
}

const isGood = (v: VerifiedImage) => Math.min(v.width, v.height) >= 200 && v.rank >= 40;

/**
 * Download and measure candidates in rank order (3 at a time), keeping the buffer of the winner so it can be cached
 * without a second download. `want` extra picks are verified for the picker.
 */
export async function verifyCandidates(
  list: ImageCandidate[],
  referer: string | undefined,
  opts: { alternatives: number; maxChecks?: number },
): Promise<{ best: (VerifiedImage & { buf: Buffer }) | null; alternatives: VerifiedImage[]; measured: number }> {
  const pool = list.filter((c) => !/^data:/.test(c.url)).slice(0, opts.maxChecks ?? 9);
  const verified: Array<{ v: VerifiedImage; buf: Buffer }> = [];
  const goodNeeded = 1 + opts.alternatives;
  for (let i = 0; i < pool.length; i += 3) {
    const batch = await Promise.all(pool.slice(i, i + 3).map((c) => measure(c, referer)));
    for (const b of batch) if (b) verified.push(b);
    const good = verified.filter((x) => isGood(x.v));
    // Stop early once the leading (strongest) candidate verified fine and we have enough alternatives.
    if (good.length >= goodNeeded || (opts.alternatives === 0 && good.length >= 1)) break;
  }
  // Same picture under different urls (e.g. size variants) should only appear once.
  verified.sort((a, b) => b.v.rank - a.v.rank);
  const seen = new Set<string>();
  const unique = verified.filter(({ v }) => {
    const sig = `${v.width}x${v.height}`;
    if (seen.has(sig) && verified.filter((o) => `${o.v.width}x${o.v.height}` === sig).length > 1 && v.source === "body") return false;
    seen.add(sig);
    return true;
  });
  // A picture under ~120px would only look like a smudge when scaled up: better to show no photo than that.
  const thumbOf = async (buf: Buffer) => {
    try {
      const out = await sharp(buf, { limitInputPixels: 80e6 }).rotate().resize({ width: 560, height: 560, fit: "inside", withoutEnlargement: true }).webp({ quality: 66 }).toBuffer();
      return `data:image/webp;base64,${out.toString("base64")}`;
    } catch {
      return undefined;
    }
  };
  const top = unique.find((x) => Math.min(x.v.width, x.v.height) >= 120);
  const altPicks = unique.filter((x) => x !== top && isGood(x.v)).slice(0, opts.alternatives);
  if (opts.alternatives > 0) {
    const thumbs = await Promise.all([top, ...altPicks].map((x) => (x ? thumbOf(x.buf) : Promise.resolve(undefined))));
    if (top) top.v.thumb = thumbs[0];
    altPicks.forEach((x, i) => (x.v.thumb = thumbs[i + 1]));
  }
  const best = top ? { ...top.v, buf: top.buf } : null;
  const alternatives = altPicks.map((x) => x.v);
  return { best, alternatives, measured: verified.length };
}

/* ----------------------------------------------------------------- public */
const CACHE_TTL = 3 * 60_000;
const cache = new Map<string, { at: number; value: ResolvedPreview }>();

/**
 * The full pipeline: fetch as social crawlers and browsers, collect every image source, verify and rank them.
 * Never throws for unreachable pages (returns a bare preview); throws AppError for invalid / blocked addresses.
 */
export async function resolveLinkPreview(rawUrl: string, opts: { alternatives?: number; fresh?: boolean } = {}): Promise<ResolvedPreview> {
  let url: URL;
  try {
    url = parsePublicUrl(rawUrl);
  } catch (e) {
    throw new AppError("BAD_REQUEST", e instanceof Error ? e.message : "Invalid link");
  }
  const key = `${opts.alternatives ?? 5}:${url.toString()}`;
  const hit = cache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  const host = url.hostname.replace(/^www\./, "");
  let page: FetchedPage;
  try {
    page = await gatherPage(url.toString(), { deadlineMs: 22_000 });
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw new AppError("BAD_REQUEST", e.message);
    return { preview: emptyPreview(url.toString(), host), best: null, alternatives: [] };
  }
  const { preview } = page;
  let referer: string | undefined;
  try {
    referer = new URL(preview.url).origin + "/";
  } catch {
    /* ignore */
  }
  const { best, alternatives, measured } = await verifyCandidates(preview.imageCandidates, referer, { alternatives: opts.alternatives ?? 5 });
  // If nothing downloaded, still surface the strongest declared candidate so the card can try hot-linking it.
  const fallback = !best && measured === 0 && preview.imageCandidates[0] ? ({ ...preview.imageCandidates[0], width: preview.imageCandidates[0].width ?? 0, height: preview.imageCandidates[0].height ?? 0, rank: 0 } as VerifiedImage) : null;
  const bestPublic: VerifiedImage | null = best ? { url: best.url, source: best.source, score: best.score, width: best.width, height: best.height, rank: best.rank, thumb: best.thumb } : fallback;
  preview.image = bestPublic?.url ?? null;
  const value: ResolvedPreview = { preview, best: bestPublic, alternatives };
  if (preview.title || bestPublic) {
    if (cache.size > 60) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}

/** Back-compat helper (metadata + ranked candidate urls, no downloads). */
export async function getLinkPreview(rawUrl: string): Promise<LinkPreview> {
  return (await resolveLinkPreview(rawUrl, { alternatives: 0 })).preview;
}

/** Download one specific remote image and store it (re-encoded, <=900px WebP). */
export async function downloadImage(url: string, referer?: string): Promise<string | null> {
  const got = await fetchImageBuffer(url, referer);
  return got ? saveRemoteImage(got.buf) : null;
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

export interface ThumbnailResult {
  imageUrl: string | null;
  faviconUrl: string | null;
  source: string | null;
  candidates: Array<{ url: string; width: number; height: number; source: string; thumb?: string }>;
}

/**
 * Cache the chosen thumbnail via the storage adapter (the verified best, or `prefer` = the user's pick).
 * If caching fails for every candidate, keep the remote https URL so cards still show the real picture.
 */
export async function resolveThumbnail(resolved: ResolvedPreview, opts: { prefer?: string | null } = {}): Promise<ThumbnailResult> {
  const { preview, best, alternatives } = resolved;
  let referer: string | undefined;
  try {
    referer = new URL(preview.url).origin + "/";
  } catch {
    /* ignore */
  }
  let imageUrl: string | null = null;
  let source: string | null = null;
  const order: Array<{ url: string; source: string }> = [];
  if (opts.prefer) order.push({ url: opts.prefer, source: "chosen" });
  if (best) order.push({ url: best.url, source: best.source });
  for (const a of alternatives) order.push({ url: a.url, source: a.source });
  for (const c of order.slice(0, 4)) {
    imageUrl = await downloadImage(c.url, referer);
    if (imageUrl) {
      source = c.source;
      break;
    }
  }
  if (!imageUrl && order[0]) {
    imageUrl = remoteFallback(order[0].url);
    source = order[0].source;
  }
  const faviconUrl = preview.favicon ? await downloadImage(preview.favicon, referer) : null;
  const candidates = [best, ...alternatives].filter((x): x is VerifiedImage => Boolean(x)).map((c) => ({ url: c.url, width: c.width, height: c.height, source: c.source, thumb: c.thumb }));
  return { imageUrl, faviconUrl, source, candidates };
}

/** Re-run the whole pipeline for a stored link. */
export async function refreshLinkThumbnail(url: string, opts: { prefer?: string | null } = {}): Promise<ThumbnailResult> {
  const resolved = await resolveLinkPreview(url, { fresh: true });
  return resolveThumbnail(resolved, opts);
}
