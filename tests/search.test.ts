import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { createPhotoItem } from "@/lib/services/items";
import { searchPage, searchPreview } from "@/lib/services/search";
import { toggleLike } from "@/lib/services/social";
import sharp from "sharp";

const PNG = () => sharp({ create: { width: 40, height: 30, channels: 3, background: "#321" } }).png().toBuffer();

async function newUser(name: string, display?: string) {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123", displayName: display ?? name } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  return { u, page };
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("search", () => {
  it("finds people, items, and shelves, and caps a preview at 5", async () => {
    const a = await newUser("ada", "Ada Lovelace");
    const b = await newUser("alan", "Alan Turing");
    const shelf = await createShelf(a.u.id, a.page.id, { name: "Ada's vinyl", category: "music" });
    await createPhotoItem(a.u.id, shelf.id, { title: "Kind of Blue notes", description: "jazz thoughts" }, await PNG());
    await createShelf(b.u.id, b.page.id, { name: "Machines", category: "tech" });

    const people = await searchPage("Ada", "people", "relevance");
    expect(people.items.some((h) => h.kind === "person" && h.title === "Ada Lovelace")).toBe(true);

    const items = await searchPage("Kind of Blue", "items", "relevance");
    expect(items.items.some((h) => h.kind === "item" && h.title === "Kind of Blue notes")).toBe(true);

    const shelves = await searchPage("vinyl", "shelves", "relevance");
    expect(shelves.items.some((h) => h.kind === "shelf" && h.title === "Ada's vinyl")).toBe(true);

    for (let i = 0; i < 6; i++) {
      await createPhotoItem(a.u.id, shelf.id, { title: `Ada extra ${i}`, description: "more ada" }, await PNG());
    }
    const preview = await searchPreview("Ada", 5);
    expect(preview.length).toBeLessThanOrEqual(5);
    expect(preview.length).toBe(5);
  });

  it("sorts items by new and by top (most liked)", async () => {
    const a = await newUser("collector");
    const shelf = await createShelf(a.u.id, a.page.id, { name: "Shelf", category: "books" });
    const older = await createPhotoItem(a.u.id, shelf.id, { title: "Shared word older", description: "" }, await PNG());
    await db.item.update({ where: { id: older.id }, data: { createdAt: new Date("2024-01-01") } });
    const newer = await createPhotoItem(a.u.id, shelf.id, { title: "Shared word newer", description: "" }, await PNG());
    const fan = await newUser("liker");
    await toggleLike(fan.u.id, older.id);
    await toggleLike(a.u.id, older.id);

    const byNew = await searchPage("Shared word", "items", "new");
    expect(byNew.items[0].id).toBe(newer.id);
    const byTop = await searchPage("Shared word", "items", "top");
    expect(byTop.items[0].id).toBe(older.id);
  });
});
