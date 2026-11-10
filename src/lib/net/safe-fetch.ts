import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { isBlockedIp } from "./ip-guard";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
  /** Extra request headers (e.g. referer). */
  headers?: Record<string, string>;
  /** Override DNS resolution (used in tests). */
  resolve?: (hostname: string) => Promise<string[]>;
  /** Only allow responses whose content-type matches (e.g. /^image\//). */
  contentTypeFilter?: RegExp;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
  truncated: boolean;
}

// Many shops and CDNs reject unknown bots; a mainstream browser identity gets the same HTML a visitor sees.
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export function parsePublicUrl(raw: string): URL {
  let input = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^(javascript|data|file|mailto|ftp|blob|tel):/i.test(input)) {
    input = `https://${input}`;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https links are supported");
  }
  if (url.username || url.password) throw new UnsafeUrlError("Links with credentials are not allowed");
  if (!url.hostname) throw new UnsafeUrlError("That doesn't look like a valid link");
  return url;
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
}

/** Resolve the hostname and return a single vetted IP; throws if ANY address is non-public. */
export async function resolveSafeAddress(hostname: string, resolve = defaultResolve): Promise<string> {
  const bare = hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(bare) ? [bare] : await resolve(bare).catch(() => []);
  if (!addresses.length) throw new UnsafeUrlError("Couldn't find that website");
  for (const a of addresses) {
    if (isBlockedIp(a)) throw new UnsafeUrlError("That address isn't allowed");
  }
  return addresses[0];
}

function requestOnce(url: URL, ip: string, opts: Required<Pick<SafeFetchOptions, "timeoutMs" | "maxBytes">> & SafeFetchOptions) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer; truncated: boolean }>(
    (resolvePromise, reject) => {
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request(
        url,
        {
          method: "GET",
          timeout: opts.timeoutMs,
          headers: {
            "user-agent": USER_AGENT,
            accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
            "accept-language": "en-US,en;q=0.9",
            ...(opts.headers ?? {}),
          },
          // DNS pinning: connect to the IP we already validated (defeats DNS rebinding).
          lookup: ((_host: string, options: unknown, cb: (...a: unknown[]) => void) => {
            const family = net.isIP(ip);
            if (typeof options === "object" && options && (options as { all?: boolean }).all) {
              cb(null, [{ address: ip, family }]);
            } else cb(null, ip, family);
          }) as never,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            res.resume();
            return resolvePromise({ status, headers: res.headers, body: Buffer.alloc(0), truncated: false });
          }
          const type = String(res.headers["content-type"] ?? "");
          if (opts.contentTypeFilter && !opts.contentTypeFilter.test(type)) {
            res.destroy();
            return reject(new UnsafeUrlError("Unsupported content type"));
          }
          const declared = Number(res.headers["content-length"]);
          if (Number.isFinite(declared) && declared > opts.maxBytes && opts.contentTypeFilter) {
            res.destroy();
            return reject(new UnsafeUrlError("Response too large"));
          }
          const chunks: Buffer[] = [];
          let size = 0;
          let truncated = false;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > opts.maxBytes) {
              truncated = true;
              const keep = chunk.length - (size - opts.maxBytes);
              if (keep > 0) chunks.push(chunk.subarray(0, keep));
              res.destroy();
              return;
            }
            chunks.push(chunk);
          });
          const finish = () => resolvePromise({ status, headers: res.headers, body: Buffer.concat(chunks), truncated });
          res.on("end", finish);
          res.on("close", finish);
          res.on("error", () => finish());
        },
      );
      req.on("timeout", () => req.destroy(new UnsafeUrlError("The website took too long to respond")));
      req.on("error", (e) => reject(e));
      req.end();
    },
  );
}

/**
 * Fetch a public URL safely: http(s) only, DNS-validated + pinned, redirects re-validated,
 * hard timeout and byte limit.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const opts = {
    timeoutMs: options.timeoutMs ?? 8000,
    maxBytes: options.maxBytes ?? 1_500_000,
    maxRedirects: options.maxRedirects ?? 4,
    ...options,
  };
  let url = parsePublicUrl(rawUrl);
  const deadline = Date.now() + opts.timeoutMs * 2;

  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    if (Date.now() > deadline) throw new UnsafeUrlError("The website took too long to respond");
    const ip = await resolveSafeAddress(url.hostname, options.resolve);
    const res = await requestOnce(url, ip, opts);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      let next: URL;
      try {
        next = new URL(String(res.headers.location), url);
      } catch {
        throw new UnsafeUrlError("Bad redirect from website");
      }
      url = parsePublicUrl(next.toString());
      continue;
    }
    return {
      url: url.toString(),
      status: res.status,
      contentType: String(res.headers["content-type"] ?? ""),
      body: res.body,
      truncated: res.truncated,
    };
  }
  throw new UnsafeUrlError("Too many redirects");
}
