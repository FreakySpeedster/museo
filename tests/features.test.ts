import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { createPhotoItem } from "@/lib/services/items";
import { activateDemoSubscription } from "@/lib/services/billing";
import { recordItemView, isLikelyBot } from "@/lib/services/views";
import { listConnections } from "@/lib/services/connections";
import { follow, setFollowPolicy } from "@/lib/services/notifications";
import { createPost, deletePost, getPost, listPosts, postsForItem, updatePost } from "@/lib/services/blog";
import { sanitizeHtml, htmlToText } from "@/lib/html";
import { FREE_ITEMS_PER_SHELF, itemCreationGate } from "@/lib/limits";

const PNG = () => sharp({ create: { width: 20, height: 20, channels: 3, background: "#09f" } }).png().toBuffer();
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36";

async function newUser(name: string) {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  const shelf = await createShelf(u.id, page.id, { name: "Books", category: "books" });
  return { u, page, shelf };
}
async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === code);
}
async function fill(userId: string, shelfId: string, n: number) {
  await db.item.createMany({ data: Array.from({ length: n }, (_, i) => ({ userId, shelfId, type: "PHOTO", title: `#${i}`, position: i })) });
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("free plan item limit", () => {
  it("gate is pure and plan-aware", () => {
    expect(itemCreationGate({ subscribed: false, itemCount: 9 }).allowed).toBe(true);
    expect(itemCreationGate({ subscribed: false, itemCount: 10 })).toEqual({ allowed: false, reason: "ITEM_LIMIT" });
    expect(itemCreationGate({ subscribed: true, itemCount: 10 }).allowed).toBe(true);
    expect(itemCreationGate({ subscribed: true, itemCount: 200 })).toEqual({ allowed: false, reason: "MAX_ITEMS" });
  });

  it("blocks the 11th item for free users with ITEM_LIMIT (402) and allows it on Plus", async () => {
    const { u, shelf } = await newUser("lim");
    await fill(u.id, shelf.id, FREE_ITEMS_PER_SHELF);
    const err = await createPhotoItem(u.id, shelf.id, { title: "eleven", description: "" }, await PNG()).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("ITEM_LIMIT");
    expect(err.status).toBe(402);
    expect(await db.item.count({ where: { shelfId: shelf.id } })).toBe(10);
    await activateDemoSubscription(u.id);
    const item = await createPhotoItem(u.id, shelf.id, { title: "eleven", description: "" }, await PNG());
    expect(item.position).toBe(10);
  });

  it("concurrent adds can't race past the limit", async () => {
    const { u, shelf } = await newUser("race");
    await fill(u.id, shelf.id, FREE_ITEMS_PER_SHELF - 1);
    const png = await PNG();
    const results = await Promise.allSettled([1, 2, 3].map((n) => createPhotoItem(u.id, shelf.id, { title: `r${n}`, description: "" }, png)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.item.count({ where: { shelfId: shelf.id } })).toBe(FREE_ITEMS_PER_SHELF);
  });
});

describe("manual photos", () => {
  it("stores up to 3 photos (first is the cover) and rejects a 4th", async () => {
    const { u, shelf } = await newUser("pics");
    const png = await PNG();
    const item = await createPhotoItem(u.id, shelf.id, { title: "three", description: "" }, [png, png, png]);
    expect(item.imageUrl).toBeTruthy();
    expect(item.images).toHaveLength(2);
    await expectCode(createPhotoItem(u.id, shelf.id, { title: "four", description: "" }, [png, png, png, png]), "BAD_REQUEST");
  });
});

describe("item views", () => {
  it("ignores the owner and bots, dedupes per viewer for 24h", async () => {
    const { u, shelf } = await newUser("own");
    const { u: other } = await newUser("viewer");
    const item = await createPhotoItem(u.id, shelf.id, { title: "seen", description: "" }, await PNG());
    expect(await recordItemView(item.id, { userId: u.id, userAgent: UA })).toEqual({ counted: false, viewCount: 0 });
    expect((await recordItemView(item.id, { userId: other.id, userAgent: UA })).viewCount).toBe(1);
    expect((await recordItemView(item.id, { userId: other.id, userAgent: UA })).counted).toBe(false);
    expect((await recordItemView(item.id, { visitorId: "a".repeat(32), userAgent: UA })).viewCount).toBe(2);
    expect((await recordItemView(item.id, { visitorId: "b".repeat(32), userAgent: "Googlebot/2.1" })).counted).toBe(false);
    // after the window, the same viewer counts again
    await db.itemView.updateMany({ data: { lastViewedAt: new Date(Date.now() - 25 * 3600_000) } });
    expect((await recordItemView(item.id, { userId: other.id, userAgent: UA })).viewCount).toBe(3);
    expect(isLikelyBot(null)).toBe(true);
    // private items can't be viewed (or counted) by others
    await db.item.update({ where: { id: item.id }, data: { visibility: "private" } });
    await expectCode(recordItemView(item.id, { userId: other.id, userAgent: UA }), "NOT_FOUND");
  });
});

describe("followers / following lists", () => {
  it("lists, searches and pages connections with the viewer's follow state", async () => {
    const { u: star } = await newUser("star");
    await setFollowPolicy(star.id, "open");
    const fans = [];
    for (const n of ["fan_amy", "fan_bob", "fan_cat", "zed"]) {
      const { u } = await newUser(n);
      await follow(u.id, "star");
      fans.push(u);
    }
    const all = await listConnections("star", "followers", fans[0].id);
    expect(all.users.map((x) => x.username)).toEqual(["zed", "fan_cat", "fan_bob", "fan_amy"]);
    expect(all.users.find((x) => x.username === "fan_amy")?.isViewer).toBe(true);
    const search = await listConnections("star", "followers", null, { q: "FAN_" });
    expect(search.users).toHaveLength(3);
    const p1 = await listConnections("star", "followers", null, { limit: 2 });
    expect(p1.users).toHaveLength(2);
    const p2 = await listConnections("star", "followers", null, { limit: 2, cursor: p1.nextCursor });
    expect(p2.users.map((x) => x.username)).toEqual(["fan_bob", "fan_amy"]);
    expect(p2.nextCursor).toBeNull();
    const following = await listConnections("zed", "following", fans[1].id);
    expect(following.users[0]).toMatchObject({ username: "star", followState: "following" });
    await expectCode(listConnections("nobody", "followers", null), "NOT_FOUND");
  });
});

describe("blog", () => {
  it("is Plus-only, sanitizes HTML, tags items and surfaces posts on the item", async () => {
    const { u, shelf } = await newUser("writer");
    const { u: reader } = await newUser("reader");
    const item = await createPhotoItem(u.id, shelf.id, { title: "Dune", description: "" }, await PNG());
    const input = { title: "Why Dune", contentHtml: '<h2>Spice</h2><p onclick="x()">Great <script>alert(1)</script><a href="javascript:alert(1)">x</a></p>', status: "published" as const, itemIds: [item.id] };
    await expectCode(createPost(u.id, input), "PAYWALL");
    await activateDemoSubscription(u.id);
    const post = await createPost(u.id, input);
    const full = await getPost(post.id, reader.id);
    expect(full.contentHtml).not.toMatch(/script|onclick|javascript/);
    expect(full.contentHtml).toContain("<h2>Spice</h2>");
    expect(full.items.map((i) => i.id)).toEqual([item.id]);
    expect(full.excerpt.startsWith("Spice")).toBe(true);
    expect((await postsForItem(item.id, reader.id)).map((p) => p.id)).toEqual([post.id]);

    // drafts are private to the author and don't show on the item
    const draft = await createPost(u.id, { title: "Draft", contentHtml: "<p>wip</p>", status: "draft", itemIds: [item.id] });
    await expectCode(getPost(draft.id, reader.id), "NOT_FOUND");
    expect((await postsForItem(item.id, null)).map((p) => p.id)).toEqual([post.id]);
    expect((await listPosts({ mine: true, viewerId: u.id })).posts).toHaveLength(2);
    expect((await listPosts({ author: "writer" })).posts).toHaveLength(1);

    // others can't edit; private items can't be tagged by others
    await expectCode(updatePost(reader.id, post.id, { title: "hack" }), "PAYWALL");
    await activateDemoSubscription(reader.id);
    await expectCode(updatePost(reader.id, post.id, { title: "hack" }), "FORBIDDEN");
    await db.item.update({ where: { id: item.id }, data: { visibility: "private" } });
    await expectCode(createPost(reader.id, { title: "t", contentHtml: "<p>x</p>", status: "draft", itemIds: [item.id] }), "BAD_REQUEST");
    expect((await getPost(post.id, reader.id)).items).toHaveLength(0); // hidden item isn't leaked

    await updatePost(u.id, post.id, { status: "draft" });
    await expectCode(getPost(post.id, null), "NOT_FOUND");
    await deletePost(u.id, post.id);
    expect(await db.blogPost.count({ where: { id: post.id } })).toBe(0);
  });

  it("sanitizer keeps formatting and drops unsafe images", () => {
    const html = sanitizeHtml('<p style="text-align: center; color: red">a</p><img src="http://x/y.png"><img src="/api/uploads/abc.webp"><pre><code class="language-ts">x</code></pre><mark>m</mark><s>s</s><u>u</u>');
    expect(html).toBe('<p style="text-align:center">a</p><img src="/api/uploads/abc.webp" /><pre><code class="language-ts">x</code></pre><mark>m</mark><s>s</s><u>u</u>');
    expect(htmlToText("<p>a</p><p>b &amp; c</p>")).toBe("a b & c");
  });
});
