import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf, updateShelf } from "@/lib/services/shelves";
import { createPhotoItem, updateItem, getVisibleItem } from "@/lib/services/items";
import { updatePage, reorderPages, reorderShelves } from "@/lib/services/pages";
import { getProfile } from "@/lib/services/profile";
import { followingFeed, globalFeed, FEED_PAGE_SIZE, userTimeline } from "@/lib/services/feed";
import { searchPreview } from "@/lib/services/search";
import { addComment, listComments, toggleLike } from "@/lib/services/social";
import { parseSocialUrl, normalizeSocialLinks } from "@/lib/social-links";
import sharp from "sharp";

const PNG = () => sharp({ create: { width: 40, height: 30, channels: 3, background: "#abc" } }).png().toBuffer();

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

describe("visibility inheritance", () => {
  it("hides a private item from everyone except the owner", async () => {
    const owner = await newUser("owner");
    const stranger = await newUser("stranger");
    const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Reads", category: "books" });
    const item = await createPhotoItem(owner.u.id, shelf.id, { title: "Secret Dune", description: "hidden" }, await PNG());
    await updateItem(owner.u.id, item.id, { visibility: "private" });

    const mine = await getVisibleItem(item.id, owner.u.id);
    expect(mine.id).toBe(item.id);
    await expectCode(getVisibleItem(item.id, stranger.u.id), "NOT_FOUND");
    await expectCode(getVisibleItem(item.id, null), "NOT_FOUND");

    const global = await globalFeed();
    expect(global.items.find((i) => i.id === item.id)).toBeUndefined();
    const following = await followingFeed(stranger.u.id);
    expect(following.items.find((i) => i.id === item.id)).toBeUndefined();
    const ownFeed = await followingFeed(owner.u.id);
    expect(ownFeed.items.find((i) => i.id === item.id)?.id).toBe(item.id);

    const hits = await searchPreview("Secret Dune", 5, stranger.u.id);
    expect(hits.find((h) => h.id === item.id)).toBeUndefined();
    const ownHits = await searchPreview("Secret Dune", 5, owner.u.id);
    expect(ownHits.find((h) => h.id === item.id)).toBeTruthy();

    const publicProfile = await getProfile(owner.u.username, stranger.u.id);
    expect(publicProfile?.stats.items).toBe(0);
    expect(publicProfile?.pages.flatMap((p) => p.shelves.flatMap((s) => s.items))).toHaveLength(0);
    expect(publicProfile?.timeline.items).toHaveLength(0);
    expect(publicProfile?.isOwner).toBe(false);

    const ownProfile = await getProfile(owner.u.username, owner.u.id);
    expect(ownProfile?.stats.items).toBe(1);
    expect(ownProfile?.pages[0].shelves[0].items[0].visibility).toBe("private");
    expect(ownProfile?.timeline.items.some((i) => i.id === item.id)).toBe(true);

    await expectCode(toggleLike(stranger.u.id, item.id), "NOT_FOUND");
    await expectCode(listComments(item.id, stranger.u.id), "NOT_FOUND");
  });

  it("hides items when the parent shelf or page is private", async () => {
    const owner = await newUser("curator");
    const fan = await newUser("fanclub");
    const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Vault", category: "books" });
    const item = await createPhotoItem(owner.u.id, shelf.id, { title: "Hidden Book", description: "n" }, await PNG());

    await updateShelf(owner.u.id, shelf.id, { visibility: "private" });
    await expectCode(getVisibleItem(item.id, fan.u.id), "NOT_FOUND");
    const asOwner = await getVisibleItem(item.id, owner.u.id);
    expect(asOwner.id).toBe(item.id);
    const afterShelf = await getProfile(owner.u.username, fan.u.id);
    expect(afterShelf?.pages[0]?.shelves ?? []).toHaveLength(0);
    expect(afterShelf?.stats.items).toBe(0);

    await updateShelf(owner.u.id, shelf.id, { visibility: "public" });
    await updatePage(owner.u.id, owner.page.id, { visibility: "private" });
    await expectCode(getVisibleItem(item.id, fan.u.id), "NOT_FOUND");
    const afterPage = await getProfile(owner.u.username, fan.u.id);
    expect(afterPage?.pages).toHaveLength(0);
    expect(afterPage?.stats.items).toBe(0);
    const hits = await searchPreview("Hidden Book", 5, fan.u.id);
    expect(hits.find((h) => h.id === item.id)).toBeUndefined();
  });
});

describe("timeline is owner-only", () => {
  it("does not return timeline data to other viewers", async () => {
    const owner = await newUser("diarist");
    const other = await newUser("peeking");
    const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Notes", category: "books" });
    await createPhotoItem(owner.u.id, shelf.id, { title: "Journal", description: "day one" }, await PNG());
    const self = await getProfile(owner.u.username, owner.u.id);
    expect(self?.timeline.items.length).toBeGreaterThan(0);
    const stranger = await getProfile(owner.u.username, other.u.id);
    expect(stranger?.timeline.items).toHaveLength(0);
    expect(stranger?.timeline.nextCursor).toBeNull();
    const mine = await userTimeline(owner.u.id, undefined, owner.u.id);
    expect(mine.items.length).toBeGreaterThan(0);
  });
});

describe("reordering", () => {
  it("persists shelf and page order for the owner", async () => {
    const owner = await newUser("arranger");
    const a = await createShelf(owner.u.id, owner.page.id, { name: "A", category: "books" });
    const b = await createShelf(owner.u.id, owner.page.id, { name: "B", category: "music" });
    await reorderShelves(owner.u.id, owner.page.id, [b.id, a.id]);
    const shelves = await db.shelf.findMany({ where: { pageId: owner.page.id }, orderBy: { position: "asc" } });
    expect(shelves.map((s) => s.id)).toEqual([b.id, a.id]);

    const page2 = await db.page.create({ data: { userId: owner.u.id, title: "Second", description: "", position: 1 } });
    await reorderPages(owner.u.id, [page2.id, owner.page.id]);
    const pages = await db.page.findMany({ where: { userId: owner.u.id }, orderBy: { position: "asc" } });
    expect(pages.map((p) => p.id)).toEqual([page2.id, owner.page.id]);
  });
});

describe("feed pagination", () => {
  it("loads a small page, not every item at once", async () => {
    const owner = await newUser("archivist");
    const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Stack", category: "books" });
    for (let i = 0; i < 12; i++) {
      await createPhotoItem(owner.u.id, shelf.id, { title: `Book ${i}`, description: "" }, await PNG());
    }
    const first = await globalFeed();
    expect(first.items).toHaveLength(FEED_PAGE_SIZE);
    expect(FEED_PAGE_SIZE).toBe(10);
    expect(first.nextCursor).toBeTruthy();
    const second = await globalFeed(first.nextCursor!);
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.items[0].id).not.toBe(first.items[0].id);
  });
});

describe("social links", () => {
  it("validates network URLs", () => {
    expect(parseSocialUrl("https://instagram.com/nook", "instagram")).toContain("instagram.com");
    expect(() => parseSocialUrl("https://example.com/x", "instagram")).toThrow(/Instagram/);
    expect(parseSocialUrl("x.com/nook", "x")).toContain("https://");
    const links = normalizeSocialLinks([
      { network: "website", url: "https://example.com" },
      { network: "website", url: "https://dup.example" },
      { network: "unknown", url: "https://x.com" },
    ]);
    expect(links).toEqual([{ network: "website", url: "https://example.com/" }]);
  });
});

describe("comments on public items still work", () => {
  it("lets a follower comment on a public item", async () => {
    const owner = await newUser("host");
    const fan = await newUser("guest");
    const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Out", category: "books" });
    const item = await createPhotoItem(owner.u.id, shelf.id, { title: "Open", description: "" }, await PNG());
    await db.follow.create({ data: { followerId: fan.u.id, followingId: owner.u.id } });
    const c = await addComment(fan.u.id, item.id, "Nice");
    expect(c.body).toBe("Nice");
  });
});
