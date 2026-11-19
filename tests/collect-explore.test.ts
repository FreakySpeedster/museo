import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { createPhotoItem, deleteItem } from "@/lib/services/items";
import { collectItem, collectTargets } from "@/lib/services/collect";
import { clearExploreCache, ensureCanonicalKeys, exploreChips, exploreItem, exploreItemPosts, exploreItems } from "@/lib/services/explore";
import { followingFeed } from "@/lib/services/feed";
import { canonicalKeyFor, normalizeTitle, normalizeUrl } from "@/lib/canonical";
import { activateDemoSubscription } from "@/lib/services/billing";

const PNG = (w = 60, h = 40) => sharp({ create: { width: w, height: h, channels: 3, background: "#3a6" } }).png().toBuffer();
const fileOf = (url: string) => path.join(process.env.UPLOAD_DIR || os.tmpdir(), url.split("/").pop()!);

async function person(name: string, category = "books") {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  const shelf = await createShelf(u.id, page.id, { name: `${name} shelf`, category });
  return { u, page, shelf };
}

async function photo(userId: string, shelfId: string, title: string, tags: string[] = []) {
  return createPhotoItem(userId, shelfId, { title, description: "A lovely thing", tags } as never, await PNG());
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === code);
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
  clearExploreCache();
});

describe("canonical keys", () => {
  it("normalises links (tracking params, www, slashes, Amazon ASIN) and titles", () => {
    expect(normalizeUrl("https://www.Example.com/Shop/Item/?utm_source=x&ref=y&size=m#top")).toBe("example.com/shop/item?size=m");
    expect(normalizeUrl("https://m.example.com/shop/item")).toBe("example.com/shop/item");
    expect(normalizeUrl("https://www.amazon.in/Some-Name/dp/B0ABCDE123/ref=sr_1?tag=x")).toBe("amazon/dp/b0abcde123");
    expect(normalizeTitle("  Bleu de Chanel — Eau de Parfum! ")).toBe("bleu de chanel eau de parfum");
    const a = canonicalKeyFor({ type: "LINK", url: "https://example.com/p/1?utm_medium=a", title: "x" });
    const b = canonicalKeyFor({ type: "LINK", url: "http://www.example.com/p/1/", title: "y" });
    expect(a).toBe(b);
    expect(canonicalKeyFor({ type: "PHOTO", title: "Monstera Deliciosa" })).toBe(canonicalKeyFor({ type: "PHOTO", title: "monstera  deliciosa!" }));
  });

  it("stores the key and the cover size on upload", async () => {
    const { u, shelf } = await person("sizer");
    const it = await createPhotoItem(u.id, shelf.id, { title: "Wide one", description: "" } as never, await PNG(120, 40));
    const row = await db.item.findUniqueOrThrow({ where: { id: it.id } });
    expect(row.canonicalKey).toBe(canonicalKeyFor({ type: "PHOTO", title: "Wide one" }));
    expect([row.imageWidth, row.imageHeight]).toEqual([120, 40]);
  });
});

describe("add to my collection", () => {
  it("copies the item, links it to the original, and blocks duplicates and own items", async () => {
    const bob = await person("bob");
    const alice = await person("alice");
    const orig = await photo(bob.u.id, bob.shelf.id, "Bleu de Chanel", ["woody", "citrus"]);

    const { item } = await collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id });
    const copy = await db.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(copy.userId).toBe(alice.u.id);
    expect(copy.shelfId).toBe(alice.shelf.id);
    expect(copy.sourceItemId).toBe(orig.id);
    expect(copy.canonicalKey).toBe(orig.canonicalKey);
    expect([copy.title, copy.description, copy.imageUrl, copy.tags]).toEqual([orig.title, orig.description, orig.imageUrl, orig.tags]);

    await expectCode(collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id }), "CONFLICT");
    // The same thing posted separately by someone else also counts as "already in".
    const dan = await person("dan");
    const twin = await photo(dan.u.id, dan.shelf.id, "bleu de CHANEL");
    await expectCode(collectItem(alice.u.id, twin.id, { shelfId: alice.shelf.id }), "CONFLICT");
    await expectCode(collectItem(bob.u.id, orig.id, { shelfId: bob.shelf.id }), "CONFLICT");

    // A copy of a copy still points at the root original.
    const carol = await person("carol");
    const second = await collectItem(carol.u.id, copy.id, { shelfId: carol.shelf.id });
    expect((await db.item.findUniqueOrThrow({ where: { id: second.item.id } })).sourceItemId).toBe(orig.id);

    const t = await collectTargets(alice.u.id, orig.id);
    expect(t.owned.map((o) => o.shelfId)).toEqual([alice.shelf.id]);
    expect(t.pages[0].shelves.find((s) => s.id === alice.shelf.id)?.already).toBe(true);
  });

  it("can create a new collection for it, inheriting the original's category", async () => {
    const bob = await person("bob2", "plants");
    const alice = await person("alice2");
    const orig = await photo(bob.u.id, bob.shelf.id, "String of pearls");
    const r = await collectItem(alice.u.id, orig.id, { newShelf: { name: "Trailing plants" } });
    const shelf = await db.shelf.findUniqueOrThrow({ where: { id: r.shelf.id } });
    expect(shelf.name).toBe("Trailing plants");
    expect(shelf.category).toBe("plants");
  });

  it("respects the free 10-item limit, and Plus lifts it", async () => {
    const bob = await person("bob3");
    const alice = await person("alice3");
    const orig = await photo(bob.u.id, bob.shelf.id, "Rare book");
    await db.item.createMany({ data: Array.from({ length: 10 }, (_, i) => ({ shelfId: alice.shelf.id, userId: alice.u.id, type: "PHOTO", title: `Filler ${i}`, position: i })) });
    expect((await collectTargets(alice.u.id, orig.id)).pages[0].shelves.find((s) => s.id === alice.shelf.id)?.full).toBe(true);
    await expectCode(collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id }), "ITEM_LIMIT");
    await activateDemoSubscription(alice.u.id);
    await collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id });
  });

  it("keeps shared photos until the last item using them is deleted", async () => {
    const bob = await person("bob4");
    const alice = await person("alice4");
    const orig = await photo(bob.u.id, bob.shelf.id, "Shared photo");
    const { item } = await collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id });
    await deleteItem(bob.u.id, orig.id);
    await expect(fs.stat(fileOf(orig.imageUrl!))).resolves.toBeTruthy();
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).sourceItemId).toBeNull();
    await deleteItem(alice.u.id, item.id);
    await expect(fs.stat(fileOf(orig.imageUrl!))).rejects.toBeTruthy();
  });

  it("marks feed posts the viewer already keeps", async () => {
    const bob = await person("bob5");
    const alice = await person("alice5");
    await db.follow.create({ data: { followerId: alice.u.id, followingId: bob.u.id } });
    const orig = await photo(bob.u.id, bob.shelf.id, "Feed thing");
    let feed = await followingFeed(alice.u.id);
    expect(feed.items[0].collected).toEqual([]);
    expect(feed.items[0].canComment).toBe(true);
    await collectItem(alice.u.id, orig.id, { shelfId: alice.shelf.id });
    feed = await followingFeed(alice.u.id);
    expect(feed.items.find((i) => i.id === orig.id)?.collected).toEqual([{ shelfId: alice.shelf.id, shelfName: alice.shelf.name }]);
  });
});

describe("explore", () => {
  it("counts distinct public owners and ranks the most-owned first", async () => {
    const a = await person("ea");
    const b = await person("eb");
    const c = await person("ec");
    const popular = await photo(a.u.id, a.shelf.id, "Dune");
    await collectItem(b.u.id, popular.id, { shelfId: b.shelf.id });
    await collectItem(c.u.id, popular.id, { shelfId: c.shelf.id });
    await photo(a.u.id, a.shelf.id, "Obscure pamphlet");
    // A private copy is not counted.
    const d = await person("ed");
    const priv = await collectItem(d.u.id, popular.id, { shelfId: d.shelf.id });
    await db.item.update({ where: { id: priv.item.id }, data: { visibility: "private" } });

    const res = await exploreItems({ chip: "trending" });
    expect(res.items[0].title).toBe("Dune");
    expect(res.items[0].owners).toBe(3);
    expect(res.items[0].ownerPreview).toHaveLength(3);
    expect(res.items.find((i) => i.title === "Obscure pamphlet")?.owners).toBe(1);

    const hero = await exploreItem(popular.canonicalKey!, d.u.id);
    expect(hero?.owners).toBe(3);
    expect(hero?.collected).toHaveLength(1);
    const posts = await exploreItemPosts(popular.canonicalKey!, null);
    expect(posts.items).toHaveLength(3);
  });

  it("personalises 'For you' to the viewer's categories and tags; signed-out gets global trending", async () => {
    const reader = await person("reader", "books");
    const gardener = await person("gardener", "plants");
    const other = await person("otherreader", "books");
    await photo(gardener.u.id, gardener.shelf.id, "Fiddle leaf fig");
    await photo(gardener.u.id, gardener.shelf.id, "Snake plant");
    await photo(other.u.id, other.shelf.id, "Piranesi");
    await photo(reader.u.id, reader.shelf.id, "My own book");

    const mine = await exploreItems({ viewerId: reader.u.id, chip: "for-you" });
    expect(mine.personal).toBe(true);
    const cats = mine.items.map((i) => i.category);
    // Matching categories come first; anything else only appears as the flagged top-up after them.
    const firstOther = cats.indexOf("plants");
    expect(cats.slice(0, firstOther === -1 ? cats.length : firstOther).every((c) => c === "books")).toBe(true);
    expect(cats[0]).toBe("books");
    expect(mine.items.find((i) => i.title === "My own book")?.mine).toBe(true);

    const chips = await exploreChips(reader.u.id);
    expect(chips.chips[0].id).toBe("for-you");
    expect(chips.chips.map((c) => c.id)).toContain("books");

    const plantsOnly = await exploreItems({ viewerId: reader.u.id, chip: "plants" });
    expect(plantsOnly.items.every((i) => i.category === "plants")).toBe(true);

    const guest = await exploreItems({ chip: "for-you" });
    expect(guest.personal).toBe(false);
    expect(new Set(guest.items.map((i) => i.category))).toEqual(new Set(["books", "plants"]));
    expect((await exploreChips(null)).chips[0].id).toBe("trending");
  });

  it("backfills grouping keys for older rows", async () => {
    const a = await person("old");
    await db.item.create({ data: { shelfId: a.shelf.id, userId: a.u.id, type: "LINK", url: "https://shop.example/x?utm_source=1", title: "Old link", position: 0 } });
    await db.item.updateMany({ data: { canonicalKey: null } });
    expect(await ensureCanonicalKeys(true)).toBeGreaterThan(0);
    const row = await db.item.findFirstOrThrow({ where: { title: "Old link" } });
    expect(row.canonicalKey).toBe(canonicalKeyFor({ type: "LINK", url: "https://shop.example/x", title: "" }));
  });
});
