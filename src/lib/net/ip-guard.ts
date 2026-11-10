import net from "node:net";

/**
 * SSRF guard primitives: decide whether an IP address is safe to connect to.
 * Anything that is not a plain, globally-routable unicast address is blocked.
 */
const blocked = new net.BlockList();

const V4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata!)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];
for (const [addr, prefix] of V4_RANGES) blocked.addSubnet(addr, prefix, "ipv4");

const V6_RANGES: Array<[string, number]> = [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64 (can embed private v4)
  ["100::", 64], // discard-only
  ["2001::", 32], // Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
];
for (const [addr, prefix] of V6_RANGES) blocked.addSubnet(addr, prefix, "ipv6");

/** Extract the embedded IPv4 from ::ffff:a.b.c.d or ::ffff:aabb:ccdd, if present. */
function mappedV4(ip: string): string | null {
  const lower = ip.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/**
 * Optional escape hatch for sandboxes / corporate egress proxies that resolve public names to a
 * reserved range (e.g. 198.18.0.0/15). Comma-separated CIDRs in SSRF_ALLOW_CIDRS. Empty by default.
 */
function allowedByOperator(ip: string): boolean {
  const raw = process.env.SSRF_ALLOW_CIDRS?.trim();
  if (!raw) return false;
  const list = new net.BlockList();
  for (const part of raw.split(",")) {
    const [addr, prefix] = part.trim().split("/");
    const family = net.isIP(addr);
    if (!family) continue;
    if (prefix === undefined) list.addAddress(addr, family === 4 ? "ipv4" : "ipv6");
    else list.addSubnet(addr, Number(prefix), family === 4 ? "ipv4" : "ipv6");
  }
  const v = net.isIP(ip);
  return v === 4 ? list.check(ip, "ipv4") : v === 6 ? list.check(ip, "ipv6") : false;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIP(ip) !== 0 && allowedByOperator(ip)) return false;
  return isBlockedIpStrict(ip);
}

function isBlockedIpStrict(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 0) return true; // not an IP at all -> never connect
  if (version === 4) return blocked.check(ip, "ipv4");
  const v4 = mappedV4(ip);
  if (v4) return isBlockedIpStrict(v4);
  return blocked.check(ip, "ipv6");
}
