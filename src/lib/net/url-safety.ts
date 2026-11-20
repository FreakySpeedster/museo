import net from "node:net";
import { AppError } from "../errors";
import {
  BLOCKED_PATH_RE,
  BLOCKED_TLDS,
  PRIVATE_HOST_RE,
  URL_MAX_LENGTH,
  isBlockedHost,
  isShortenerHost,
} from "../link-policy";

const bad = (message: string) => new AppError("BAD_REQUEST", message);

/**
 * Validate and normalise a user-supplied item link (create and edit). Throws AppError(BAD_REQUEST).
 * Only public http(s) web addresses: no credentials, IP literals, private hosts, odd ports or blocked sites.
 */
export function validateItemUrl(raw: string): URL {
  const input = (raw ?? "").trim();
  if (!input) throw bad("Link is required");
  if (input.length > URL_MAX_LENGTH) throw bad("That link is too long");
  if (/[\u0000-\u001f\u007f\s]/.test(input)) throw bad("That doesn't look like a valid link");
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) && !/^[^:/]+:\d+(\/|$)/.test(input);
  if (hasScheme && !/^https?:\/\//i.test(input)) throw bad("Only http and https links are supported");
  let url: URL;
  try {
    url = new URL(hasScheme ? input : `https://${input}`);
  } catch {
    throw bad("That doesn't look like a valid link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw bad("Only http and https links are supported");
  if (url.username || url.password) throw bad("Links with a username or password are not allowed");
  if (url.port) throw bad("Links to unusual ports are not allowed");
  const host = url.hostname.replace(/\.$/, "");
  if (!host) throw bad("That doesn't look like a valid link");
  if (net.isIP(host.replace(/^\[|\]$/g, "")) !== 0 || /^[\d.]+$/.test(host) || /^0x/i.test(host)) {
    throw bad("Use the site's name instead of an IP address");
  }
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || !/^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i.test(tld) || PRIVATE_HOST_RE.test(host)) {
    throw bad("That link doesn't point to a public website");
  }
  if (isBlockedHost(host) || BLOCKED_TLDS.includes(tld.toLowerCase())) throw bad("Links to that site aren't allowed on Museo");
  if (BLOCKED_PATH_RE.test(url.pathname)) throw bad("Links straight to app or program downloads aren't allowed");
  url.hostname = host.toLowerCase();
  url.hash = url.hash === "#" ? "" : url.hash;
  const out = url.toString();
  if (out.length > URL_MAX_LENGTH) throw bad("That link is too long");
  return url;
}

/** After following redirects: the stored destination must itself be valid and not a (still unexpanded) shortener. */
export function validateDestination(raw: string): URL {
  const url = validateItemUrl(raw);
  if (isShortenerHost(url.hostname)) throw bad("Short links hide where they go. Paste the full link instead.");
  return url;
}

/* ------------------------------------------------------------ reputation */

export type Reputation = { verdict: "clean" | "unsafe" | "unverified" | "skipped"; threats: string[] };

const SB_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
let warnedMissingKey = false;

/**
 * Google Safe Browsing Lookup API v4. Fail-open: a network error / timeout returns "unverified" (the item is
 * saved but flagged so the interstitial warns); no API key returns "skipped" (logged once).
 */
export async function checkReputation(urls: string[], opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}): Promise<Reputation> {
  const key = process.env.SAFE_BROWSING_API_KEY?.trim();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[url-safety] SAFE_BROWSING_API_KEY is not set; skipping Safe Browsing checks (local blocklist still applies)");
    }
    return { verdict: "skipped", threats: [] };
  }
  const list = [...new Set(urls.filter(Boolean))].slice(0, 10);
  try {
    const res = await (opts.fetchImpl ?? fetch)(`${SB_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 2500),
      body: JSON.stringify({
        client: { clientId: "museo", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: list.map((url) => ({ url })),
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[url-safety] Safe Browsing responded ${res.status}; failing open`);
      return { verdict: "unverified", threats: [] };
    }
    const body = (await res.json().catch(() => ({}))) as { matches?: Array<{ threatType?: string }> };
    const threats = [...new Set((body.matches ?? []).map((m) => m.threatType ?? "UNKNOWN"))];
    return { verdict: threats.length ? "unsafe" : "clean", threats };
  } catch {
    console.warn("[url-safety] Safe Browsing check failed (network/timeout); failing open");
    return { verdict: "unverified", threats: [] };
  }
}

/** Reputation gate for a link (original + final destination). Throws on known-bad; returns the Item.linkCheck value. */
export async function assertReputation(urls: string[], opts?: Parameters<typeof checkReputation>[1]): Promise<string | null> {
  const rep = await checkReputation(urls, opts);
  if (rep.verdict === "unsafe") throw new AppError("UNPROCESSABLE", "This link has been reported as unsafe (phishing or malware) and can't be posted.");
  return rep.verdict === "unverified" ? "unverified" : null;
}
