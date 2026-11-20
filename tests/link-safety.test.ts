import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// No network: the unfurl pipeline is stubbed. "Short" links expand via this map; anything else resolves to itself.
const expand: Record<string, string> = { "https://bit.ly/abc": "https://shop.example-store.com/item/1" };
vi.mock("@/lib/link-preview", () => ({
  resolveLinkPreview: vi.fn(async (u: string) => {
    const url = expand[u] ?? u;
    return {
      preview: { url, title: `Page ${new URL(url).pathname}`, description: "", siteName: new URL(url).hostname, image: null, imageCandidates: [], favicon: null, oembedUrl: null, ampUrl: null, canonicalUrl: null, fetchedAs: "test" },
      best: null,
      alternatives: [],
    };
  }),
  resolveThumbnail: vi.fn(async () => ({ imageUrl: null, faviconUrl: null })),
  downloadImage: vi.fn(async () => null),
}));

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { createLinkItem, reportItemLink, updateItemUrl } from "@/lib/services/items";
import { linkFlagOf, toItemDTO } from "@/lib/mappers";
import { checkReputation, validateDestination, validateItemUrl } from "@/lib/net/url-safety";
import { isBlockedHost, isShortenerHost, REPORT_HIDE_THRESHOLD } from "@/lib/link-policy";

const code = (c: string) => (e: unknown) => e instanceof AppError && e.code === c;

describe("validateItemUrl", () => {
  it("accepts and normalises public web links", () => {
    expect(validateItemUrl("Example.COM/a?b=1").toString()).toBe("https://example.com/a?b=1");
    expect(validateItemUrl("http://www.shop.co.uk/x#top").hostname).toBe("www.shop.co.uk");
    expect(validateItemUrl("https://müller.de/").hostname).toBe("xn--mller-kva.de");
  });
  it.each([
    ["javascript:alert(1)"], ["JaVaScRiPt:alert(1)"], ["data:text/html,hi"], ["file:///etc/passwd"], ["ftp://x.com/a"], ["mailto:a@b.com"],
    ["https://user:pass@example.com/"], ["https://user@example.com/"],
    ["http://127.0.0.1/"], ["http://10.0.0.5/"], ["http://[::1]/"], ["http://2130706433/"], ["http://0x7f000001/"],
    ["http://localhost:3000/"], ["https://router.local/"], ["https://intranet/"], ["https://metadata.internal/"],
    ["https://example.com:8443/"], ["https://grabify.link/abc"], ["https://invoice.zip/"], ["https://example.com/setup.exe"],
    ["https://exa mple.com/"], [`https://example.com/${"a".repeat(2100)}`], [""],
  ])("rejects %s", (u) => {
    expect(() => validateItemUrl(u)).toThrow(AppError);
  });
});

describe("blocklist and shorteners", () => {
  it("matches hosts and subdomains", () => {
    expect(isShortenerHost("bit.ly")).toBe(true);
    expect(isShortenerHost("www.tinyurl.com")).toBe(true);
    expect(isShortenerHost("notbit.ly")).toBe(false);
    expect(isBlockedHost("x.iplogger.org")).toBe(true);
    expect(isBlockedHost("example.com")).toBe(false);
  });
  it("never stores an unexpanded short link", () => {
    expect(() => validateDestination("https://bit.ly/zzz")).toThrow(/Short links/);
    expect(validateDestination("https://example.com/a").hostname).toBe("example.com");
  });
});

describe("Safe Browsing reputation", () => {
  const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
  it("skips gracefully without a key", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "");
    expect((await checkReputation(["https://example.com/"])).verdict).toBe("skipped");
  });
  it("flags matches as unsafe, clean otherwise, and fails open on network errors", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    expect(await checkReputation(["https://evil.example/"], { fetchImpl: ok({ matches: [{ threatType: "SOCIAL_ENGINEERING" }] }) })).toEqual({ verdict: "unsafe", threats: ["SOCIAL_ENGINEERING"] });
    expect((await checkReputation(["https://example.com/"], { fetchImpl: ok({}) })).verdict).toBe("clean");
    const boom = (async () => { throw new Error("timeout"); }) as unknown as typeof fetch;
    expect((await checkReputation(["https://example.com/"], { fetchImpl: boom })).verdict).toBe("unverified");
    vi.unstubAllEnvs();
  });
});

async function setup() {
  const mk = async (n: string) => {
    const u = await createUser({ email: `${n}@test.dev`, username: n, password: "password123" } as never);
    const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
    return { u, page };
  };
  const owner = await mk("owner");
  const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Finds", category: "books" });
  const item = await createLinkItem(owner.u.id, shelf.id, { url: "https://example.com/first", title: "", description: "", tags: [] });
  return { owner, shelf, item, mk };
}

describe("link items: create, edit, report", () => {
  beforeAll(async () => {
    await db.$connect();
    vi.stubEnv("SAFE_BROWSING_API_KEY", "");
  });
  beforeEach(async () => {
    await db.user.deleteMany();
    await db.rateLimit.deleteMany();
  });

  it("expands short links on create and rejects unsafe ones", async () => {
    const { owner, shelf, item } = await setup();
    expect(item.originalUrl).toBe("https://example.com/first");
    const short = await createLinkItem(owner.u.id, shelf.id, { url: "bit.ly/abc", title: "", description: "", tags: [] });
    expect(short.url).toBe("https://shop.example-store.com/item/1");
    await expect(createLinkItem(owner.u.id, shelf.id, { url: "https://bit.ly/nope", title: "", description: "", tags: [] })).rejects.toSatisfy(code("BAD_REQUEST"));
    await expect(createLinkItem(owner.u.id, shelf.id, { url: "javascript:alert(1)", title: "", description: "", tags: [] })).rejects.toSatisfy(code("BAD_REQUEST"));
  });

  it("lets only the owner edit the URL, keeps the original and marks it edited", async () => {
    const { item, mk } = await setup();
    const other = await mk("mallory");
    await expect(updateItemUrl(other.u.id, item.id, "https://example.com/swap")).rejects.toSatisfy(code("FORBIDDEN"));
    const { item: a, changed } = await updateItemUrl(item.userId, item.id, "https://example.com/second");
    expect(changed).toBe(true);
    expect(a.url).toBe("https://example.com/second");
    expect(a.title).toBe("Page /second");
    expect(a.urlEditedAt).toBeInstanceOf(Date);
    const { item: b } = await updateItemUrl(item.userId, item.id, "https://example.com/third", { title: "My own title" });
    expect(b.originalUrl).toBe("https://example.com/first");
    expect(b.title).toBe("My own title");
    expect(toItemDTO(b).urlEditedAt).toBeTruthy();
    expect((await updateItemUrl(item.userId, item.id, "https://example.com/third")).changed).toBe(false);
    await expect(updateItemUrl(item.userId, item.id, "http://192.168.1.1/")).rejects.toSatisfy(code("BAD_REQUEST"));
  });

  it("rate-limits URL edits to 5 per hour", async () => {
    const { item } = await setup();
    for (let i = 0; i < 5; i++) await updateItemUrl(item.userId, item.id, `https://example.com/v${i}`);
    await expect(updateItemUrl(item.userId, item.id, "https://example.com/v6")).rejects.toSatisfy(code("RATE_LIMITED"));
  });

  it("gates the link once enough distinct people report it", async () => {
    const { item, mk } = await setup();
    await expect(reportItemLink(item.userId, item.id, "scam")).rejects.toSatisfy(code("BAD_REQUEST"));
    const reporters = await Promise.all(Array.from({ length: REPORT_HIDE_THRESHOLD }, (_, i) => mk(`rep${i}`)));
    const first = await reportItemLink(reporters[0].u.id, item.id, "scam");
    expect(first).toMatchObject({ alreadyReported: false, hidden: false });
    expect((await reportItemLink(reporters[0].u.id, item.id, "spam")).alreadyReported).toBe(true);
    let last;
    for (const r of reporters.slice(1)) last = await reportItemLink(r.u.id, item.id, "scam");
    expect(last?.hidden).toBe(true);
    const row = await db.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(row.reportCount).toBe(REPORT_HIDE_THRESHOLD);
    expect(linkFlagOf(row)).toBe("reported");
    expect(await db.itemReport.count({ where: { itemId: item.id } })).toBe(REPORT_HIDE_THRESHOLD);
  });
});
