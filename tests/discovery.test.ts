import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import {
  TRENDING_HALF_LIFE_HOURS,
  TRENDING_WEIGHTS,
  TRENDING_WINDOW_DAYS,
  decayedWeight,
  getTopic,
  suggestedCollectors,
  trendingCollections,
  trendingScore,
} from "@/lib/services/discovery";

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

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("trending score", () => {
  it("halves a signal's weight every half-life and drops it after the window", () => {
    expect(decayedWeight("like", 0)).toBeCloseTo(TRENDING_WEIGHTS.like);
    expect(decayedWeight("like", TRENDING_HALF_LIFE_HOURS)).toBeCloseTo(TRENDING_WEIGHTS.like / 2);
    expect(decayedWeight("like", TRENDING_HALF_LIFE_HOURS * 2)).toBeCloseTo(TRENDING_WEIGHTS.like / 4);
    expect(decayedWeight("save", TRENDING_WINDOW_DAYS * 24 + 1)).toBe(0);
    expect(decayedWeight("save", -5)).toBeCloseTo(TRENDING_WEIGHTS.save);
  });

  it("weights saves above likes above new items above follows, and sums signals", () => {
    expect(decayedWeight("save", 1)).toBeGreaterThan(decayedWeight("like", 1));
    expect(decayedWeight("like", 1)).toBeGreaterThan(decayedWeight("item", 1));
    expect(decayedWeight("item", 1)).toBeGreaterThan(decayedWeight("follow", 1));
    const s = trendingScore([{ kind: "like", ageHours: 0 }, { kind: "save", ageHours: TRENDING_HALF_LIFE_HOURS }]);
    expect(s).toBeCloseTo(TRENDING_WEIGHTS.like + TRENDING_WEIGHTS.save / 2);
    // Fresh beats stale even with fewer signals.
    expect(trendingScore([{ kind: "like", ageHours: 2 }, { kind: "like", ageHours: 2 }])).toBeGreaterThan(
      trendingScore([{ kind: "like", ageHours: 140 }, { kind: "like", ageHours: 140 }, { kind: "like", ageHours: 140 }]),
    );
  });

  it("ranks collections by recent outside activity, one per owner, public only", async () => {
    const a = await newUser("alice");
    const b = await newUser("bob");
    const c = await newUser("carol");
    const fans = await Promise.all(["f1", "f2", "f3"].map((x) => newUser(x)));
    const old = new Date(Date.now() - 30 * 86400_000);
    const sa = await shelfOf(a, "Hot lenses", "photography");
    const sa2 = await shelfOf(a, "Second shelf", "photography");
    const sb = await shelfOf(b, "Old news", "photography");
    const sc = await shelfOf(c, "Secret", "photography");
    await db.shelf.update({ where: { id: sc.id }, data: { visibility: "private" } });
    const ia = await item(a, sa.id, { createdAt: old });
    await item(a, sa2.id, { createdAt: old });
    const ib = await item(b, sb.id, { createdAt: old });
    const ic = await item(c, sc.id, { createdAt: old });
    for (const f of fans) {
      await db.itemLike.create({ data: { userId: f.id, itemId: ia.id, createdAt: hoursAgo(3) } });
      await db.itemLike.create({ data: { userId: f.id, itemId: ib.id, createdAt: hoursAgo(150) } });
      await db.itemLike.create({ data: { userId: f.id, itemId: ic.id, createdAt: hoursAgo(1) } });
    }
    await db.savedItem.create({ data: { userId: fans[0].id, itemId: ia.id } });
    // The owner liking their own item doesn't count.
    await db.itemLike.create({ data: { userId: b.id, itemId: ib.id } });
    const { collections, fallback } = await trendingCollections({ limit: 5 });
    expect(fallback).toBe(false);
    const names = collections.map((x) => x.name);
    expect(names[0]).toBe("Hot lenses");
    expect(names).toContain("Old news");
    expect(names).not.toContain("Secret");
    expect(names).not.toContain("Second shelf"); // one per owner
    expect(collections[0].score).toBeGreaterThan(collections[1].score);
    expect(collections[0].owner).not.toHaveProperty("email");
  });

  it("falls back to popular collections in a quiet week", async () => {
    const a = await newUser("alice");
    const s = await shelfOf(a, "Quiet", "books");
    await item(a, s.id, { createdAt: new Date(Date.now() - 40 * 86400_000) });
    const r = await trendingCollections({ limit: 5 });
    expect(r.fallback).toBe(true);
    expect(r.collections.map((x) => x.name)).toEqual(["Quiet"]);
  });
});

describe("people you might like", () => {
  it("suggests shared-category and follows-of-follows collectors, excluding self, followed, requested and private", async () => {
    const me = await newUser("me");
    const friend = await newUser("friend");
    const fof = await newUser("fofuser");
    const twin = await newUser("twin");
    const followed = await newUser("followed");
    const pending = await newUser("pending", "request");
    const hidden = await newUser("hidden");
    await item(me, (await shelfOf(me, "My cams", "photography")).id);
    await item(friend, (await shelfOf(friend, "F", "books")).id);
    await item(fof, (await shelfOf(fof, "X", "books")).id);
    await item(twin, (await shelfOf(twin, "Twin cams", "photography")).id);
    await item(followed, (await shelfOf(followed, "Y", "photography")).id);
    await item(pending, (await shelfOf(pending, "Z", "photography")).id);
    await item(hidden, (await shelfOf(hidden, "H", "photography")).id, { visibility: "private" });
    await db.follow.createMany({
      data: [
        { followerId: me.id, followingId: friend.id },
        { followerId: me.id, followingId: followed.id },
        { followerId: friend.id, followingId: fof.id },
      ],
    });
    await db.followRequest.create({ data: { requesterId: me.id, targetId: pending.id } });

    const list = await suggestedCollectors(me.id, { limit: 20 });
    const names = list.map((s) => s.user.username);
    expect(names).toEqual(expect.arrayContaining(["twin", "fofuser"]));
    for (const x of ["me", "friend", "followed", "pending", "hidden"]) expect(names).not.toContain(x);
    expect(list.find((s) => s.user.username === "twin")?.reason).toBe("Also collects Photography");
    expect(list.find((s) => s.user.username === "fofuser")?.reason).toBe("Followed by @friend");
    expect(list.every((s) => s.followState === "none")).toBe(true);
    expect(list[0].user).not.toHaveProperty("email");
  });

  it("falls back to popular collectors when signed out", async () => {
    const a = await newUser("alice");
    const b = await newUser("bob");
    const c = await newUser("carol");
    await item(a, (await shelfOf(a, "A", "books")).id);
    await item(b, (await shelfOf(b, "B", "books")).id);
    await db.follow.create({ data: { followerId: c.id, followingId: b.id } });
    const list = await suggestedCollectors(null, { limit: 5 });
    expect(list.map((s) => s.user.username)).toEqual(["bob", "alice"]);
  });
});

describe("topics", () => {
  it("only exists for built-in categories and shows public things only", async () => {
    expect(await getTopic("nope", null)).toBeNull();
    expect(await getTopic("other", null)).toBeNull();
    const a = await newUser("alice");
    const s = await shelfOf(a, "Watches", "watches");
    const pub = await item(a, s.id);
    await item(a, s.id, { visibility: "private" });
    const t = await getTopic("watches", null);
    expect(t?.label).toBe("Watches");
    expect(t?.stats).toEqual({ collectors: 1, items: 1 });
    expect(t?.items.map((i) => i.id)).toEqual([pub.id]);
    expect(t?.collections.map((c) => c.name)).toEqual(["Watches"]);
  });
});

