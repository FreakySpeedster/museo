import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createPage, deletePage } from "@/lib/services/pages";
import { createShelf } from "@/lib/services/shelves";
import { createPhotoItem, deleteItem, reorderItems, updateItem } from "@/lib/services/items";
import { activateDemoSubscription, applyStripeSubscription } from "@/lib/services/billing";
import { followingFeed, userTimeline } from "@/lib/services/feed";
import { sniffImage } from "@/lib/uploads";
import sharp from "sharp";

const PNG = () =>
  sharp({ create: { width: 40, height: 30, channels: 3, background: "#f60" } }).png().toBuffer();

async function newUser(name: string) {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  return { u, page };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === code);
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("shelf limit (server-side)", () => {
  it("rejects the 6th shelf on a page but allows 5 on another page", async () => {
    const { u, page } = await newUser("alice");
    for (let i = 1; i <= 5; i++) await createShelf(u.id, page.id, { name: `Shelf ${i}`, category: "books" });
    await expectCode(createShelf(u.id, page.id, { name: "Too many", category: "music" }), "SHELF_LIMIT");
    expect(await db.shelf.count({ where: { pageId: page.id } })).toBe(5);

    await activateDemoSubscription(u.id);
    const p2 = await createPage(u.id, { title: "Second", description: "" });
    await createShelf(u.id, p2.id, { name: "Fresh", category: "music" });
  });

  it("holds under concurrent requests", async () => {
    const { u, page } = await newUser("racer");
    const results = await Promise.allSettled(
      Array.from({ length: 9 }, (_, i) => createShelf(u.id, page.id, { name: `S${i}`, category: "art" })),
    );
    expect(await db.shelf.count({ where: { pageId: page.id } })).toBe(5);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(4);
  });
});

describe("page paywall", () => {
  it("first page is free (created at signup); second is blocked until subscribed", async () => {
    const { u } = await newUser("bob");
    expect(await db.page.count({ where: { userId: u.id } })).toBe(1);
    await expectCode(createPage(u.id, { title: "Two", description: "" }), "PAYWALL");

    await activateDemoSubscription(u.id);
    const p = await createPage(u.id, { title: "Two", description: "" });
    expect(p.title).toBe("Two");
  });

  it("a canceled Stripe subscription re-locks new pages but keeps existing ones", async () => {
    const { u } = await newUser("carol");
    await applyStripeSubscription({ userId: u.id, customerId: "cus_1", subscriptionId: "sub_1", status: "active" });
    await createPage(u.id, { title: "Two", description: "" });
    await applyStripeSubscription({ customerId: "cus_1", status: "canceled" });
    await expectCode(createPage(u.id, { title: "Three", description: "" }), "PAYWALL");
    expect(await db.page.count({ where: { userId: u.id } })).toBe(2);
  });
});

describe("authorization", () => {
  it("only owners can modify shelves, items and pages", async () => {
    const a = await newUser("owner");
    const b = await newUser("intruder");
    const shelf = await createShelf(a.u.id, a.page.id, { name: "Mine", category: "books" });
    await expectCode(createShelf(b.u.id, a.page.id, { name: "Hack", category: "books" }), "FORBIDDEN");
    await expectCode(createPhotoItem(b.u.id, shelf.id, { title: "x", description: "" }, await PNG()), "FORBIDDEN");
    const item = await createPhotoItem(a.u.id, shelf.id, { title: "Mine", description: "" }, await PNG());
    await expectCode(updateItem(b.u.id, item.id, { title: "pwned" }), "FORBIDDEN");
    await expectCode(deleteItem(b.u.id, item.id), "FORBIDDEN");
    await expectCode(deletePage(b.u.id, a.page.id), "FORBIDDEN");
    await expectCode(reorderItems(b.u.id, shelf.id, { itemIds: [item.id] }), "FORBIDDEN");
  });
});

describe("items, uploads and timeline", () => {
  it("validates images by content, not by name", async () => {
    const { u, page } = await newUser("dave");
    const shelf = await createShelf(u.id, page.id, { name: "Pics", category: "photography" });
    await expectCode(createPhotoItem(u.id, shelf.id, { title: "Evil", description: "" }, Buffer.from("<svg onload=alert(1)></svg>")), "UPLOAD_INVALID");
    await expectCode(createPhotoItem(u.id, shelf.id, { title: "Evil", description: "" }, Buffer.from("MZ\x90\x00 not an image at all")), "UPLOAD_INVALID");
    const png = await PNG();
    expect(sniffImage(png)).toBe("png");
    const item = await createPhotoItem(u.id, shelf.id, { title: "Ok", description: "d" }, png);
    expect(item.imageUrl).toMatch(/^\/api\/uploads\/[a-f0-9]{32}\.webp$/);
  });

  it("every item shows on the owner's timeline, newest first, and reorder persists", async () => {
    const { u, page } = await newUser("erin");
    const shelf = await createShelf(u.id, page.id, { name: "S", category: "art" });
    const a = await createPhotoItem(u.id, shelf.id, { title: "first", description: "" }, await PNG());
    await new Promise((r) => setTimeout(r, 5));
    const b = await createPhotoItem(u.id, shelf.id, { title: "second", description: "" }, await PNG());
    const tl = await userTimeline(u.id);
    expect(tl.items.map((i) => i.title)).toEqual(["second", "first"]);
    expect(tl.items[0].shelf.name).toBe("S");

    await reorderItems(u.id, shelf.id, { itemIds: [b.id, a.id] });
    const ordered = await db.item.findMany({ where: { shelfId: shelf.id }, orderBy: { position: "asc" } });
    expect(ordered.map((i) => i.title)).toEqual(["second", "first"]);
    await expectCode(reorderItems(u.id, shelf.id, { itemIds: [a.id] }), "BAD_REQUEST");
  });

  it("following feed includes followed users", async () => {
    const a = await newUser("fa");
    const b = await newUser("fb");
    const shelf = await createShelf(b.u.id, b.page.id, { name: "S", category: "art" });
    await createPhotoItem(b.u.id, shelf.id, { title: "from b", description: "" }, await PNG());
    expect((await followingFeed(a.u.id)).items).toHaveLength(0);
    await db.follow.create({ data: { followerId: a.u.id, followingId: b.u.id } });
    expect((await followingFeed(a.u.id)).items.map((i) => i.title)).toEqual(["from b"]);
  });
});

describe("page creation race", () => {
  it("concurrent page creates cannot bypass the paywall", async () => {
    const { u } = await newUser("pagerace");
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => createPage(u.id, { title: `P${i}`, description: "" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(0);
    expect(await db.page.count({ where: { userId: u.id } })).toBe(1);
  });
});
