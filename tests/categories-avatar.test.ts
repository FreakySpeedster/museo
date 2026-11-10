import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { CATEGORY_GROUPS, categoryMeta, isValidCategory, makeCustomCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { createUser, removeAvatar, setAvatar } from "@/lib/services/accounts";
import { shelfSchema } from "@/lib/validation";

describe("categories", () => {
  it("keeps every legacy id valid and offers a broad grouped list with unique ids", () => {
    for (const id of ["books", "music", "film-tv", "games", "art", "photography", "fashion", "food", "travel", "tech", "plants", "home", "toys", "code", "reading", "other"]) {
      expect(isValidCategory(id)).toBe(true);
    }
    const ids = CATEGORY_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(60);
    expect(ids).toEqual(expect.arrayContaining(["sneakers", "watches", "fragrance", "jewelry", "vinyl", "comics", "lego", "tcg", "coins", "stamps", "cars", "pets"]));
  });

  it("supports custom categories and falls back to Other for unknown legacy values", () => {
    const c = makeCustomCategory("  Teapots   of Yixing ");
    expect(c).toBe("custom:Teapots of Yixing");
    expect(isValidCategory(c)).toBe(true);
    expect(categoryMeta(c).label).toBe("Teapots of Yixing");
    expect(shelfSchema.safeParse({ name: "x", category: c }).success).toBe(true);
    expect(shelfSchema.safeParse({ name: "x", category: "custom:" }).success).toBe(false);
    expect(shelfSchema.safeParse({ name: "x", category: "custom:" + "a".repeat(31) }).success).toBe(false);
    expect(shelfSchema.safeParse({ name: "x", category: "nope" }).success).toBe(false);
    expect(categoryMeta("nope").id).toBe("other");
  });

  it("every category resolves to an icon component", () => {
    for (const g of CATEGORY_GROUPS) for (const i of g.items) expect(categoryMeta(i.id).icon).toBeTruthy();
  });
});

describe("avatars", () => {
  beforeEach(async () => {
    await db.user.deleteMany();
  });

  it("stores a square 512px WebP, replaces it, and removes it (cleaning up the old file)", async () => {
    const u = await createUser({ email: "av@test.dev", username: "avatarperson", password: "password123" } as never);
    const wide = await sharp({ create: { width: 900, height: 300, channels: 3, background: "#09f" } }).png().toBuffer();
    const a = await setAvatar(u.id, wide);
    expect(a.avatarUrl).toMatch(/^\/api\/uploads\/[a-f0-9]{32}\.webp$/);
    const path = (await import("node:path")).default;
    const fs = (await import("node:fs")).default;
    const file = path.join(process.env.UPLOAD_DIR || (await import("node:os")).default.tmpdir(), a.avatarUrl!.split("/").pop()!);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([512, 512, "webp"]);
    const tall = await sharp({ create: { width: 700, height: 1400, channels: 3, background: "#f90" } }).png().toBuffer();
    const b = await setAvatar(u.id, tall);
    expect(b.avatarUrl).not.toBe(a.avatarUrl);
    expect(fs.existsSync(file)).toBe(false);
    expect((await sharp(path.join(process.env.UPLOAD_DIR || (await import("node:os")).default.tmpdir(), b.avatarUrl!.split("/").pop()!)).metadata()).width).toBe(512);
    const c = await removeAvatar(u.id);
    expect(c.avatarUrl).toBeNull();
  });

  it("rejects non-images", async () => {
    const u = await createUser({ email: "av2@test.dev", username: "avatarperson2", password: "password123" } as never);
    await expect(setAvatar(u.id, Buffer.from("this is definitely not an image file"))).rejects.toMatchObject({ code: "UPLOAD_INVALID" });
  });
});
