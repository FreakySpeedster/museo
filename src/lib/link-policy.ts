/**
 * Link safety policy: what Museo accepts as an item's source link. Pure data, shared by server and client.
 *
 * Shortener policy: a short link hides where it goes, so we never store one. On create / edit the link is
 * followed to its real destination (safe-fetch, redirects included) and that destination is what gets saved
 * and safety-checked. If a short link can't be expanded, it is rejected with "paste the full link".
 */

export const URL_MAX_LENGTH = 2048;

/** Distinct reports after which the link is gated behind a warning on the interstitial. */
export const REPORT_HIDE_THRESHOLD = 3;

/** Owner URL edits allowed per user per hour. */
export const URL_EDIT_LIMIT = { max: 5, windowMs: 60 * 60_000 } as const;

export const REPORT_REASONS = ["scam", "malware", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Generic shorteners whose destination is invisible until followed. */
export const SHORTENER_HOSTS = [
  "bit.ly", "bitly.com", "bitly.is", "j.mp", "tinyurl.com", "tiny.cc", "tiny.one", "goo.gl", "ow.ly", "is.gd", "v.gd",
  "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "s.id", "t.ly", "bl.ink", "short.gy", "soo.gd",
  "clck.ru", "u.to", "x.co", "qrco.de", "t.co", "lnkd.in", "trib.al", "dlvr.it", "surl.li", "shorturl.asia",
];

/** Never allowed: IP loggers and ad-gated link monetisers that are routinely used to deliver scams. */
export const BLOCKED_HOSTS = [
  "grabify.link", "iplogger.org", "iplogger.com", "iplogger.ru", "iplogger.co", "2no.co", "yip.su", "blasze.com",
  "ipgrabber.ru", "adf.ly", "shorte.st", "ouo.io", "ouo.press", "exe.io", "linkvertise.com", "bc.vc",
];

/** TLDs that read like file names in a caption ("invoice.zip") and are a common phishing trick. */
export const BLOCKED_TLDS = ["zip", "mov"];

/** Direct links to executables / installers. */
export const BLOCKED_PATH_RE = /\.(exe|scr|msi|bat|cmd|pif|apk|dmg|pkg|jar|vbs|ps1|hta|lnk)$/i;

/** Hostnames that only make sense on a private network. */
export const PRIVATE_HOST_RE = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|home\.arpa|test|invalid|example)$/i;

const matches = (host: string, list: readonly string[]) => {
  const h = host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return list.some((d) => h === d || h.endsWith(`.${d}`));
};
export const isShortenerHost = (host: string) => matches(host, SHORTENER_HOSTS);
export const isBlockedHost = (host: string) => matches(host, BLOCKED_HOSTS);
