import { describe, expect, it } from "vitest";
import { isBlockedIp } from "@/lib/net/ip-guard";
import { parsePublicUrl, resolveSafeAddress, safeFetch, UnsafeUrlError } from "@/lib/net/safe-fetch";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1", "127.8.8.8", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:7f00:1",
    "::ffff:169.254.169.254", "64:ff9b::7f00:1", "not-an-ip",
  ])("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "140.82.112.3", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isBlockedIp(ip)).toBe(false),
  );
});

describe("parsePublicUrl", () => {
  it("adds https:// when no scheme is given", () => {
    expect(parsePublicUrl("github.com/vercel").toString()).toBe("https://github.com/vercel");
  });
  it.each(["file:///etc/passwd", "ftp://example.com", "javascript:alert(1)", "data:text/html,hi", "https://user:pw@example.com"])(
    "rejects %s",
    (u) => expect(() => parsePublicUrl(u)).toThrow(UnsafeUrlError),
  );
});

describe("resolveSafeAddress", () => {
  it("rejects hostnames resolving to private addresses (DNS rebinding style)", async () => {
    await expect(resolveSafeAddress("evil.test", async () => ["10.0.0.1"])).rejects.toThrow(/isn't allowed/);
  });
  it("rejects when ANY record is private", async () => {
    await expect(resolveSafeAddress("evil.test", async () => ["8.8.8.8", "127.0.0.1"])).rejects.toThrow(UnsafeUrlError);
  });
  it("accepts public addresses and returns one", async () => {
    await expect(resolveSafeAddress("ok.test", async () => ["93.184.216.34"])).resolves.toBe("93.184.216.34");
  });
  it("fails when the name does not resolve", async () => {
    await expect(resolveSafeAddress("nx.test", async () => [])).rejects.toThrow(UnsafeUrlError);
  });
});

describe("safeFetch", () => {
  it.each([
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.1.2.3/",
    "http://2130706433/", // decimal-encoded 127.0.0.1
    "http://0x7f.1/", // hex-ish loopback
  ])("refuses %s", async (u) => {
    await expect(safeFetch(u, { timeoutMs: 1500 })).rejects.toThrow(UnsafeUrlError);
  });
  it("refuses a public-looking name that resolves to loopback", async () => {
    await expect(safeFetch("https://innocent.test/", { resolve: async () => ["127.0.0.1"] })).rejects.toThrow(/isn't allowed/);
  });
});

describe("SSRF_ALLOW_CIDRS operator override", () => {
  it("is off by default and only unblocks the listed range", () => {
    delete process.env.SSRF_ALLOW_CIDRS;
    expect(isBlockedIp("198.18.0.1")).toBe(true);
    process.env.SSRF_ALLOW_CIDRS = "198.18.0.0/15";
    try {
      expect(isBlockedIp("198.18.0.1")).toBe(false);
      expect(isBlockedIp("127.0.0.1")).toBe(true);
      expect(isBlockedIp("169.254.169.254")).toBe(true);
      expect(isBlockedIp("10.0.0.1")).toBe(true);
    } finally {
      delete process.env.SSRF_ALLOW_CIDRS;
    }
  });
});
