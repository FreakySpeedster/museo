import crypto from "node:crypto";

/**
 * "Is this the same thing?" across users. Links group by a normalised URL (tracking params, www/m.,
 * fragments and trailing slashes dropped; Amazon reduced to its ASIN). Photos group by a normalised title.
 * The key is a short hash so it is URL-safe (/explore/item/<key>).
 */
const TRACKING = /^(utm_.*|ref|ref_|ref_src|fbclid|gclid|dclid|msclkid|igshid|si|mc_cid|mc_eid|_ga|spm|psc|th|smid|tag|linkcode|camp|creative|pd_rd_.*|pf_rd_.*|source|feature)$/i;

export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  let path = decodeURIComponent(u.pathname).replace(/\/+$/, "").toLowerCase();
  const asin = /amazon\./.test(host) ? path.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})/i) : null;
  if (asin) return `amazon/dp/${asin[1].toLowerCase()}`;
  if (host === "youtu.be") return `youtube.com/watch?v=${path.slice(1)}`;
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? "?" + params.map(([k, v]) => `${k}=${v}`).join("&") : "";
  path = path || "";
  return host + path + query;
}

export function normalizeTitle(raw: string): string | null {
  const t = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return t.length >= 2 ? t : null;
}

const hash = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 20);

export function canonicalKeyFor(item: { type: string; url?: string | null; title: string }): string | null {
  const url = item.type === "LINK" && item.url ? normalizeUrl(item.url) : null;
  if (url) return hash("u:" + url);
  const title = normalizeTitle(item.title);
  return title ? hash("t:" + title) : null;
}

export const isCanonicalKey = (k: string) => /^[a-z0-9]{8,40}$/.test(k);
