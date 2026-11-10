import * as cheerio from "cheerio";

/* ------------------------------------------------------------------ types */
export type CandidateSource = "og" | "twitter" | "jsonld" | "microdata" | "image_src" | "preload" | "site" | "oembed" | "amp" | "body";

export interface ImageCandidate {
  url: string;
  source: CandidateSource;
  /** Base rank before the image is downloaded and measured (higher is better). */
  score: number;
  /** Declared size (og:image:width / height, Amazon dynamic-image map, ...) when known. */
  width?: number;
  height?: number;
}

export interface PageMetadata {
  title: string;
  description: string;
  siteName: string;
  /** Best candidate url (strict meta-tag priority). */
  image: string | null;
  /** Every plausible thumbnail, best first. */
  imageCandidates: ImageCandidate[];
  favicon: string | null;
  /** Discovered alternates worth following when the page has no usable image. */
  oembedUrl: string | null;
  ampUrl: string | null;
  canonicalUrl: string | null;
}

/* ------------------------------------------------------------ url helpers */
const ENTITY_RE = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi;
export function decodeEntities(s: string): string {
  let out = s;
  for (let i = 0; i < 3 && ENTITY_RE.test(out); i++) {
    ENTITY_RE.lastIndex = 0;
    out = out.replace(ENTITY_RE, (m, e: string) => {
      const l = e.toLowerCase();
      if (l === "amp") return "&";
      if (l === "lt") return "<";
      if (l === "gt") return ">";
      if (l === "quot") return '"';
      if (l === "apos") return "'";
      const n = l.startsWith("#x") ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    });
  }
  ENTITY_RE.lastIndex = 0;
  return out;
}

/**
 * Resolve + normalise a raw image reference: entities decoded, relative / protocol-relative resolved,
 * http upgraded to https, and well-known "tiny size" CDN parameters upgraded to a large rendition.
 */
export function cleanImageUrl(raw: string | undefined | null, base: string): string | null {
  if (!raw) return null;
  let v = decodeEntities(raw.trim()).replace(/\\\//g, "/").replace(/\\u0026/gi, "&");
  if (!v || /^(data|blob|javascript):/i.test(v)) return null;
  v = v.replace(/\{width\}/gi, "1200").replace(/\{height\}/gi, "1200").replace(/%7Bwidth%7D/gi, "1200").replace(/%7Bheight%7D/gi, "1200");
  let u: URL;
  try {
    u = new URL(v, base);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.protocol === "http:") u.protocol = "https:";
  const host = u.hostname;
  // Amazon: "..._SX38_SY50_CR,0,0,38,50_.jpg" / "._SL160_.jpg" -> original rendition.
  if (/(media-amazon|ssl-images-amazon|images-amazon)\.com$/i.test(host)) {
    u.pathname = u.pathname.replace(/\._[A-Za-z0-9,_%.-]+_(\.[a-z0-9]+)$/i, "$1");
  }
  // Shopify: ".../name_100x100.jpg", "...name_grande.jpg", "?width=300" -> large.
  if (/cdn\.shopify\.com$/i.test(host) || /\/cdn\/shop\//.test(u.pathname)) {
    u.pathname = u.pathname.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|\d{1,4}x\d{0,4}|\d{0,4}x\d{1,4})(@\dx)?(\.[a-z0-9]+)$/i, "$3");
    for (const key of ["width", "height"]) {
      const cur = Number(u.searchParams.get(key));
      if (u.searchParams.has(key) && cur > 0 && cur < 1000) u.searchParams.set(key, "1200");
    }
    // Shopify serves any size on demand: ask for 1200px instead of the 4000px original (faster to verify, still sharp).
    if (!u.searchParams.has("width") && /\.(jpe?g|png|webp)$/i.test(u.pathname)) u.searchParams.set("width", "1200");
  }
  // Myntra: "h_200,w_200,c_fill,g_auto/h_1440,q_75,w_1080/..." -> drop the leading 200px crop.
  if (/myntassets\.com$/i.test(host)) u.pathname = u.pathname.replace(/^\/h_\d+,w_\d+,c_fill,g_auto(?=\/h_)/, "");
  // Flipkart: rukminim*.flixcart.com/image/128/128/... -> 832x832.
  if (/flixcart\.com$/i.test(host)) u.pathname = u.pathname.replace(/\/image\/\d+\/\d+\//, "/image/832/832/");
  return u.toString();
}

/** Stable identity of an image across http/https, query strings and size variants (for de-duplication). */
export function imageKey(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

const LOGO_RE = /(sprite|favicon|logo|icon|avatar|placeholder|pixel|tracking|spacer|blank|badge|button|banner|header|footer|loader|spinner|arrow|flag|payment|visa|mastercard)/i;
export const looksLikeIcon = (src: string) => LOGO_RE.test(src) || /\.(svg|ico)(\?|$)/i.test(src);

const clean = (s: string | undefined, max: number) => decodeEntities(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Titles of bot-challenge / maintenance / login walls that sites serve to datacenter crawlers instead of the product page. */
const BLOCK_TITLE_RE = /^(site maintenance|access denied|just a moment|attention required|robot or human|are you a robot|403 forbidden|request blocked|pardon our interruption|security check|verify you are human|please verify|login( |$)|log in( |$)|sign in( |$)|online shopping india( |\|))/i;
export const isBlockPageTitle = (title: string) => BLOCK_TITLE_RE.test(title.trim());

/** Only the document head matters for social crawlers (WhatsApp reads roughly the first 300 KB). */
export function headOf(html: string): string {
  const end = html.search(/<\/head\s*>/i);
  return end > 0 ? html.slice(0, end + 7) : html.slice(0, 400_000);
}

/* ------------------------------------------------------------- candidates */
const BASE_SCORE: Record<CandidateSource, number> = { site: 98, og: 100, twitter: 90, jsonld: 82, microdata: 78, oembed: 76, image_src: 72, amp: 66, preload: 50, body: 30 };

class Candidates {
  private map = new Map<string, ImageCandidate>();
  constructor(private base: string) {}
  add(raw: string | undefined | null, source: CandidateSource, extra: { width?: number; height?: number; bonus?: number } = {}) {
    const url = cleanImageUrl(raw, this.base);
    if (!url) return;
    let score = BASE_SCORE[source] + (extra.bonus ?? 0);
    if (looksLikeIcon(url)) score -= source === "og" || source === "twitter" ? 15 : 45;
    const key = imageKey(url);
    const prev = this.map.get(key);
    if (prev && prev.score >= score) return;
    this.map.set(key, { url, source, score, width: extra.width ?? prev?.width, height: extra.height ?? prev?.height });
  }
  list(): ImageCandidate[] {
    // Stable: higher score first; ties keep insertion order.
    return [...this.map.values()].map((c, i) => ({ c, i })).sort((a, b) => b.c.score - a.c.score || a.i - b.i).map((x) => x.c);
  }
}

function walkJsonLd(node: unknown, visit: (o: Record<string, unknown>) => void, depth = 0) {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) return node.forEach((n) => walkJsonLd(n, visit, depth + 1));
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  visit(o);
  for (const v of Object.values(o)) if (v && typeof v === "object") walkJsonLd(v, visit, depth + 1);
}

function imageRefs(v: unknown): Array<{ url: string; width?: number; height?: number }> {
  const out: Array<{ url: string; width?: number; height?: number }> = [];
  const list = Array.isArray(v) ? v : [v];
  for (const it of list) {
    if (typeof it === "string") out.push({ url: it });
    else if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      const u = o.url ?? o.contentUrl ?? o["@id"];
      if (typeof u === "string") out.push({ url: u, width: num(o.width), height: num(o.height) });
    }
  }
  return out;
}

function srcsetBest(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  let best: { url: string; w: number } | undefined;
  for (const part of srcset.split(/,\s+(?=\S)/)) {
    const [u, d] = part.trim().split(/\s+/);
    if (!u) continue;
    const w = d?.endsWith("w") ? parseInt(d, 10) : d?.endsWith("x") ? parseFloat(d) * 1000 : 0;
    if (!best || w >= best.w) best = { url: u, w };
  }
  return best?.url;
}

/** Parse title / description / ranked image candidates / favicon out of an HTML document. */
export function parseMetadata(html: string, baseUrl: string): PageMetadata {
  const $ = cheerio.load(html);
  const meta = (key: string) => $(`meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`).first().attr("content")?.trim();

  const title = clean(meta("og:title") || meta("twitter:title") || $("title").first().text() || $("h1").first().text(), 120);
  const description = clean(meta("og:description") || meta("twitter:description") || meta("description"), 500);
  let host = "";
  try {
    host = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const siteName = clean(meta("og:site_name") || meta("application-name"), 60) || host;

  const cands = new Candidates(baseUrl);

  // 1) Open Graph (strict priority, in the order WhatsApp/Facebook read them).
  const ogW = num(meta("og:image:width"));
  const ogH = num(meta("og:image:height"));
  let first = true;
  for (const key of ["og:image:secure_url", "og:image:url", "og:image"]) {
    $(`meta[property="${key}"], meta[name="${key}"]`).each((_, el) => {
      cands.add($(el).attr("content"), "og", { width: ogW, height: ogH, bonus: first ? 2 : 0 });
      first = false;
    });
  }
  // 2) Twitter cards.
  for (const key of ["twitter:image", "twitter:image:src"]) {
    $(`meta[name="${key}"], meta[property="${key}"]`).each((_, el) => cands.add($(el).attr("content"), "twitter"));
  }
  // 3) Site-specific hooks (product galleries that the generic tags miss or shrink).
  siteCandidates($, baseUrl, cands);
  // 4) JSON-LD (Product / ImageObject / @graph / arrays).
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      walkJsonLd(JSON.parse($(el).contents().text().trim()), (o) => {
        const type = JSON.stringify(o["@type"] ?? "");
        const isProduct = /Product|ImageObject|IndividualProduct|Offer/i.test(type);
        for (const key of ["image", "thumbnailUrl", "contentUrl"]) {
          if (o[key] === undefined) continue;
          if (key !== "image" && !/ImageObject/i.test(type)) continue;
          for (const ref of imageRefs(o[key])) cands.add(ref.url, "jsonld", { width: ref.width, height: ref.height, bonus: isProduct ? 3 : 0 });
        }
      });
    } catch {
      /* malformed JSON-LD */
    }
  });
  // 5) Microdata + <meta itemprop=image> + <link rel=image_src> + preload hints.
  $('[itemprop="image"]').each((_, el) => {
    const t = $(el);
    cands.add(t.attr("content") || t.attr("src") || t.attr("href") || t.attr("data-src"), "microdata");
  });
  cands.add($('link[rel="image_src"]').first().attr("href"), "image_src");
  $('link[rel="preload"][as="image"]').each((_, el) => cands.add(srcsetBest($(el).attr("imagesrcset")) || $(el).attr("href"), "preload"));
  // 6) Body images (lazy-loaded attributes + srcset), only meaningful ones, scored by declared size.
  let bodyCount = 0;
  $("img, source").each((_, el) => {
    if (bodyCount >= 14) return false;
    const t = $(el);
    const raw = srcsetBest(t.attr("srcset") || t.attr("data-srcset")) || t.attr("data-src") || t.attr("data-original") || t.attr("data-lazy-src") || t.attr("src");
    if (!raw) return;
    const w = num(t.attr("width"));
    const h = num(t.attr("height"));
    if ((w && w < 200) || (h && h < 150)) return;
    const cls = `${t.attr("class") ?? ""} ${t.attr("id") ?? ""} ${t.attr("alt") ?? ""}`;
    const gallery = /(product|gallery|main|hero|primary|zoom|carousel|slide|featured)/i.test(cls);
    const area = (w ?? 0) * (h ?? 0);
    cands.add(raw, "body", { width: w, height: h, bonus: (gallery ? 12 : 0) + Math.min(10, Math.floor(area / 200_000)) });
    bodyCount++;
  });

  const list = cands.list();

  let favicon: string | null = null;
  const icons = $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="shortcut icon"]').toArray();
  const apple = icons.find((el) => /apple-touch-icon/.test($(el).attr("rel") ?? ""));
  favicon = cleanImageUrl($(apple ?? icons[0]).attr("href"), baseUrl) ?? cleanImageUrl("/favicon.ico", baseUrl);

  const oembed = $('link[rel="alternate"][type*="oembed"]').first().attr("href");
  const amp = $('link[rel="amphtml"]').first().attr("href");
  const canonical = $('link[rel="canonical"]').first().attr("href");
  const resolve = (h?: string) => {
    if (!h) return null;
    try {
      return new URL(decodeEntities(h), baseUrl).toString();
    } catch {
      return null;
    }
  };

  return {
    title,
    description,
    siteName,
    image: list[0]?.url ?? null,
    imageCandidates: list,
    favicon,
    oembedUrl: resolve(oembed),
    ampUrl: resolve(amp),
    canonicalUrl: resolve(canonical),
  };
}

/* ------------------------------------------------------------- site hooks */
function siteCandidates($: cheerio.CheerioAPI, baseUrl: string, cands: Candidates) {
  let host = "";
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return;
  }
  if (/(^|\.)amazon\.[a-z.]+$/i.test(host) || /(^|\.)amzn\.[a-z]+$/i.test(host)) {
    // landingImage carries a JSON map of every rendition: {"https://...jpg":[w,h], ...}
    for (const sel of ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront", "#main-image", "#imgTagWrapperId img"]) {
      const el = $(sel).first();
      if (!el.length) continue;
      const dyn = el.attr("data-a-dynamic-image");
      if (dyn) {
        try {
          const map = JSON.parse(decodeEntities(dyn)) as Record<string, [number, number]>;
          const sorted = Object.entries(map).sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1]);
          for (const [u, [w, h]] of sorted.slice(0, 2)) cands.add(u, "site", { width: w, height: h, bonus: 7 });
        } catch {
          /* ignore */
        }
      }
      cands.add(el.attr("data-old-hires") || el.attr("src"), "site", { bonus: 6 });
    }
  }
  if (/(^|\.)flipkart\.com$/i.test(host)) {
    $('img[src*="rukminim"], img[srcset*="rukminim"]').slice(0, 4).each((_, el) => cands.add(srcsetBest($(el).attr("srcset")) || $(el).attr("src"), "site", { bonus: -2 }));
  }
  if (/(^|\.)myntra\.com$/i.test(host)) {
    $('.image-grid-image, .image-grid-imageContainer img, img[src*="myntassets"]').slice(0, 3).each((_, el) => {
      const style = $(el).attr("style") ?? "";
      const m = /url\(["']?([^"')]+)/.exec(style);
      cands.add(m?.[1] || $(el).attr("src"), "site", { bonus: -2 });
    });
  }
  if (/(^|\.)(ajio|nykaa|tatacliq|meesho)\.com$/i.test(host)) {
    $('img[src*="assets"], img.rilrtl-lazy-img, img[class*="product"], img[class*="Product"]').slice(0, 4).each((_, el) => cands.add(srcsetBest($(el).attr("srcset")) || $(el).attr("src"), "site", { bonus: -3 }));
  }
}

/** Extra candidates derived from the URL alone (no HTML needed). */
export function urlCandidates(rawUrl: string): ImageCandidate[] {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return [];
  }
  const out: ImageCandidate[] = [];
  const yt = youtubeId(u);
  if (yt) {
    for (const [name, bonus] of [["maxresdefault", 0], ["sddefault", -2], ["hqdefault", -4]] as const) {
      out.push({ url: `https://i.ytimg.com/vi/${yt}/${name}.jpg`, source: "site", score: 99 + bonus });
    }
  }
  return out;
}

export function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return /^[\w-]{11}$/.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null;
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname);
    if (m) return m[1];
  }
  return null;
}

/** Candidates from an oEmbed JSON document (thumbnail_url, or the url of a photo type). */
export function oembedCandidates(json: unknown, baseUrl: string): ImageCandidate[] {
  if (!json || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  const out: ImageCandidate[] = [];
  const add = (raw: unknown, width?: unknown, height?: unknown) => {
    const url = typeof raw === "string" ? cleanImageUrl(raw, baseUrl) : null;
    if (url) out.push({ url, source: "oembed", score: BASE_SCORE.oembed, width: num(width), height: num(height) });
  };
  if (o.type === "photo") add(o.url, o.width, o.height);
  add(o.thumbnail_url, o.thumbnail_width, o.thumbnail_height);
  return out;
}

/** Decode HTML bytes using the declared charset (header or <meta>), defaulting to UTF-8. */
export function decodeHtml(body: Buffer, contentType: string): string {
  let charset = /charset=([\w-]+)/i.exec(contentType)?.[1];
  if (!charset) {
    const head = body.subarray(0, 4096).toString("latin1");
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(charset ?? "utf-8").decode(body);
  } catch {
    return body.toString("utf8");
  }
}
