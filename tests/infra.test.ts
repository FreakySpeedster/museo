import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", () => blob);

import { blobEnabled, storageDriver } from "@/lib/storage";
import { deleteUploadByUrl, saveUploadedImage } from "@/lib/uploads";

describe("database-backed rate limiter", () => {
  it("allows up to the limit then blocks, per key", async () => {
    const key = `t:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit(key, 3, 60_000)).ok);
    expect(results).toEqual([true, true, true, false, false]);
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    expect((await rateLimit(`other:${key}`, 3, 60_000)).ok).toBe(true);
  });

  it("is atomic under concurrency", async () => {
    const key = `c:${Math.random()}`;
    const res = await Promise.all(Array.from({ length: 20 }, () => rateLimit(key, 7, 60_000)));
    expect(res.filter((r) => r.ok)).toHaveLength(7);
  });

  it("starts a new window once the old one expires", async () => {
    const key = `w:${Math.random()}`;
    expect((await rateLimit(key, 1, 1000)).ok).toBe(true);
    expect((await rateLimit(key, 1, 1000)).ok).toBe(false);
    await db.$executeRaw`UPDATE "RateLimit" SET "windowStart" = now() - interval '5 seconds' WHERE "key" = ${key}`;
    expect((await rateLimit(key, 1, 1000)).ok).toBe(true);
  });
});

describe("storage adapter", () => {
  const png = () => sharp({ create: { width: 20, height: 20, channels: 3, background: "#fa0" } }).png().toBuffer();
  const origToken = process.env.BLOB_READ_WRITE_TOKEN;
  afterEach(() => {
    if (origToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = origToken;
    delete process.env.VERCEL;
    blob.put.mockReset();
    blob.del.mockReset();
  });

  it("uses local disk when no Blob token is set", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(storageDriver()).toBe("local");
    const url = await saveUploadedImage(await png());
    expect(url).toMatch(/^\/api\/uploads\/[a-f0-9]{32}\.webp$/);
    const file = path.join(process.env.UPLOAD_DIR || os.tmpdir(), url.split("/").pop()!);
    expect(fs.existsSync(file)).toBe(true);
    await deleteUploadByUrl(url);
    expect(fs.existsSync(file)).toBe(false);
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token";
    expect(blobEnabled()).toBe(true);
    blob.put.mockImplementation(async (name: string) => ({ url: `https://abc.public.blob.vercel-storage.com/${name}` }));
    const url = await saveUploadedImage(await png());
    expect(url).toMatch(/^https:\/\/abc\.public\.blob\.vercel-storage\.com\/uploads\/[a-f0-9]{32}\.webp$/);
    expect(blob.put).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/[a-f0-9]{32}\.webp$/), expect.any(Buffer), expect.objectContaining({ access: "public", contentType: "image/webp" }));
    await deleteUploadByUrl(url);
    expect(blob.del).toHaveBeenCalledWith(url);
    await deleteUploadByUrl("https://evil.example.com/x.webp"); // foreign URLs are never deleted
    await deleteUploadByUrl("/seed/01-dune.svg"); // static seed art is never deleted
    expect(blob.del).toHaveBeenCalledTimes(1);
  });

  it("fails clearly on Vercel when no storage is configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.VERCEL = "1";
    await expect(saveUploadedImage(await png())).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });
});
