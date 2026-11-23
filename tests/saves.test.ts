import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { getVisibleItem } from "@/lib/services/items";
import { listSaved, savedCountForOwner, setSaved } from "@/lib/services/saves";
import { safeNext } from "@/lib/safe-next";

async function newUser(name: string, followPolicy: "open" | "request" = "open") {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  await db.user.update({ where: { id: u.id }, data: { followPolicy } });
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  return { id: u.id, username: name, pageId: page.id };
}

async function shelfOf(u: { id: string; pageId: string }, name: string, category: string) {
  return createShelf(u.id, u.pageId, { name, category });
}

let n = 0;
async function item(u: { id: string }, shelfId: string, extra: { visibility?: string; createdAt?: Date } = {}) {
  n++;
  return db.item.create({ data: { userId: u.id, shelfId, type: "PHOTO", title: `Thing ${n}`, ...extra } });
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === code);
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("Want list (saves)", () => {
  it("saves and unsaves someone else's public item, idempotently", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const s = await shelfOf(owner, "Cameras", "photography");
    const it1 = await item(owner, s.id);
    expect(await setSaved(fan.id, it1.id, true)).toEqual({ savedByMe: true });
    expect(await setSaved(fan.id, it1.id, true)).toEqual({ savedByMe: true });
    expect(await db.savedItem.count()).toBe(1);
    expect((await listSaved(fan.id)).items.map((i) => i.id)).toEqual([it1.id]);
    expect(await setSaved(fan.id, it1.id, false)).toEqual({ savedByMe: false });
    expect(await setSaved(fan.id, it1.id, false)).toEqual({ savedByMe: false });
    expect((await listSaved(fan.id)).items).toHaveLength(0);
  });

  it("lets you save your own items, including private ones", async () => {
    const me = await newUser("me");
    const s = await shelfOf(me, "Mine", "books");
    const priv = await item(me, s.id, { visibility: "private" });
    expect((await setSaved(me.id, priv.id, true)).savedByMe).toBe(true);
    expect((await listSaved(me.id)).items).toHaveLength(1);
  });

  it("refuses items you can't see (private item, private collection, missing)", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const s = await shelfOf(owner, "Open", "books");
    const hidden = await item(owner, s.id, { visibility: "private" });
    await expectCode(setSaved(fan.id, hidden.id, true), "NOT_FOUND");
    const ps = await shelfOf(owner, "Secret", "books");
    await db.shelf.update({ where: { id: ps.id }, data: { visibility: "private" } });
    const inPrivateShelf = await item(owner, ps.id);
    await expectCode(setSaved(fan.id, inPrivateShelf.id, true), "NOT_FOUND");
    await expectCode(setSaved(fan.id, "nope", true), "NOT_FOUND");
  });

  it("hides saved items that went private, but you can still remove them", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const s = await shelfOf(owner, "Open", "books");
    const it1 = await item(owner, s.id);
    await setSaved(fan.id, it1.id, true);
    await db.item.update({ where: { id: it1.id }, data: { visibility: "private" } });
    expect((await listSaved(fan.id)).items).toHaveLength(0);
    await setSaved(fan.id, it1.id, false);
    expect(await db.savedItem.count()).toBe(0);
  });

  it("is private: savedByMe is per viewer, lists are per owner, no public counts", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const other = await newUser("other");
    const s = await shelfOf(owner, "Open", "books");
    const it1 = await item(owner, s.id);
    await setSaved(fan.id, it1.id, true);
    expect((await getVisibleItem(it1.id, fan.id)).savedByMe).toBe(true);
    expect((await getVisibleItem(it1.id, other.id)).savedByMe).toBe(false);
    const anon = await getVisibleItem(it1.id, null);
    expect("savedByMe" in anon).toBe(false);
    expect((await listSaved(other.id)).items).toHaveLength(0);
    // Only the item's owner gets a count.
    expect(await savedCountForOwner(owner.id, it1.id)).toBe(1);
    expect(await savedCountForOwner(fan.id, it1.id)).toBeNull();
  });

  it("cascades when the item or the saver is deleted", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const s = await shelfOf(owner, "Open", "books");
    const a = await item(owner, s.id);
    const b = await item(owner, s.id);
    await setSaved(fan.id, a.id, true);
    await setSaved(fan.id, b.id, true);
    await db.item.delete({ where: { id: a.id } });
    expect(await db.savedItem.count()).toBe(1);
    await db.user.delete({ where: { id: fan.id } });
    expect(await db.savedItem.count()).toBe(0);
  });

  it("pages newest first with a stable cursor", async () => {
    const owner = await newUser("owner");
    const fan = await newUser("fan");
    const s = await shelfOf(owner, "Open", "books");
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const it1 = await item(owner, s.id);
      await db.savedItem.create({ data: { userId: fan.id, itemId: it1.id, createdAt: hoursAgo(10 - i) } });
      ids.push(it1.id);
    }
    const p1 = await listSaved(fan.id, null, 2);
    const p2 = await listSaved(fan.id, p1.nextCursor, 2);
    const p3 = await listSaved(fan.id, p2.nextCursor, 2);
    expect([...p1.items, ...p2.items, ...p3.items].map((i) => i.id)).toEqual([...ids].reverse());
    expect(p3.nextCursor).toBeNull();
  });
});

describe("safeNext", () => {
  it("accepts local paths and rejects open redirects", () => {
    expect(safeNext("/saved")).toBe("/saved");
    expect(safeNext("/i/abc?x=1")).toBe("/i/abc?x=1");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "saved", "", null, undefined, "/a\nb"]) expect(safeNext(bad)).toBeNull();
  });
});
