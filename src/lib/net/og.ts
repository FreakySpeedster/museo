import * as cheerio from "cheerio";

export interface PageMetadata {
  title: string;
  description: string;
  siteName: string;
  image: string | null;
  favicon: string | null;
}

function abs(href: string | undefined, base: string): string | null {
  if (!href) return null;
  const v = href.trim();
  if (!v || v.startsWith("data:")) return null;
  try {
    const u = new URL(v, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const clean = (s: string | undefined, max: number) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function looksLikeIcon(src: string): boolean {
  return /(sprite|icon|logo|avatar|pixel|tracking|spacer|blank|badge|button)/i.test(src) || /\.(svg|gif)(\?|$)/i.test(src);
}

/** Parse title / description / best image / favicon out of an HTML document. */
export function parseMetadata(html: string, baseUrl: string): PageMetadata {
  const $ = cheerio.load(html);
  const meta = (key: string) => {
    const sel = `meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`;
    return $(sel).first().attr("content")?.trim();
  };

  const title = clean(meta("og:title") || meta("twitter:title") || $("title").first().text() || $("h1").first().text(), 120);
  const description = clean(meta("og:description") || meta("twitter:description") || meta("description"), 500);
  let host = "";
  try {
    host = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const siteName = clean(meta("og:site_name") || meta("application-name"), 60) || host;

  let image: string | null = null;
  for (const key of ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"]) {
    image = abs(meta(key), baseUrl);
    if (image) break;
  }
  if (!image) image = abs($('link[rel="image_src"]').first().attr("href"), baseUrl);
  if (!image) {
    // First reasonably large <img> in the document.
    $("img").each((_, el) => {
      const src = abs($(el).attr("src") || $(el).attr("data-src"), baseUrl);
      if (!src || looksLikeIcon(src)) return;
      const w = parseInt($(el).attr("width") ?? "", 10);
      const h = parseInt($(el).attr("height") ?? "", 10);
      if ((Number.isFinite(w) && w < 200) || (Number.isFinite(h) && h < 150)) return;
      image = src;
      return false;
    });
  }

  let favicon: string | null = null;
  const icons = $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="shortcut icon"]').toArray();
  const apple = icons.find((el) => /apple-touch-icon/.test($(el).attr("rel") ?? ""));
  favicon = abs(($(apple ?? icons[0]).attr("href")), baseUrl);
  if (!favicon) favicon = abs("/favicon.ico", baseUrl);

  return { title, description, siteName, image, favicon };
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
