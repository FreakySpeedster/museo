import { db } from "../db";
import { AppError } from "../errors";
import { resolveLinkPreview, resolveThumbnail } from "../link-preview";
import { deleteUploadByUrl, saveUploadedImage } from "../uploads";
import { itemCreateLinkSchema, itemTextSchema, itemUpdateSchema, reorderSchema } from "../validation";
import { assertShelfOwner } from "./shelves";
import type { z } from "zod";

export const MAX_ITEMS_PER_SHELF = 200;

async function nextPosition(shelfId: string) {
  const count = await db.item.count({ where: { shelfId } });
  if (count >= MAX_ITEMS_PER_SHELF) {
    throw new AppError("UNPROCESSABLE", `A shelf can hold at most ${MAX_ITEMS_PER_SHELF} items`);
  }
  return count;
}

export async function createLinkItem(
  userId: string,
  shelfId: string,
  input: z.infer<typeof itemCreateLinkSchema>,
  opts: { imageUrl?: string; photo?: Buffer } = {},
) {
  await assertShelfOwner(userId, shelfId);
  const position = await nextPosition(shelfId);
  // The user's own photo wins; then a candidate they picked; otherwise the best verified image from the page.
  const own = opts.photo ? await saveUploadedImage(opts.photo) : null;
  const resolved = await resolveLinkPreview(input.url);
  const { preview } = resolved;
  const thumb = own ? { imageUrl: own, faviconUrl: (await resolveThumbnail({ ...resolved, best: null, alternatives: [] })).faviconUrl } : await resolveThumbnail(resolved, { prefer: opts.imageUrl });
  const { imageUrl, faviconUrl } = thumb;
  let host = preview.siteName;
  try {
    host = host || new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const title = input.title || preview.title || host || "Untitled link";
  const description = input.description || preview.description;
  return db.item.create({
    data: {
      shelfId,
      userId,
      type: "LINK",
      url: preview.url,
      imageUrl,
      faviconUrl,
      title: title.slice(0, 120),
      description: description.slice(0, 500),
      siteName: host || null,
      position,
    },
  });
}

export async function createPhotoItem(
  userId: string,
  shelfId: string,
  input: z.infer<typeof itemTextSchema>,
  file: Buffer,
) {
  await assertShelfOwner(userId, shelfId);
  if (!input.title) throw new AppError("BAD_REQUEST", "Title is required");
  const position = await nextPosition(shelfId);
  const imageUrl = await saveUploadedImage(file);
  try {
    return await db.item.create({
      data: { shelfId, userId, type: "PHOTO", imageUrl, title: input.title, description: input.description, position },
    });
  } catch (e) {
    await deleteUploadByUrl(imageUrl);
    throw e;
  }
}

async function assertItemOwner(userId: string, itemId: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, include: { shelf: { include: { page: true } } } });
  if (!item) throw new AppError("NOT_FOUND", "Item not found");
  if (item.shelf.page.userId !== userId) throw new AppError("FORBIDDEN", "That item belongs to someone else");
  return item;
}

export async function updateItem(userId: string, itemId: string, input: z.infer<typeof itemUpdateSchema>) {
  await assertItemOwner(userId, itemId);
  return db.item.update({ where: { id: itemId }, data: input });
}

export async function deleteItem(userId: string, itemId: string) {
  const item = await assertItemOwner(userId, itemId);
  await db.item.delete({ where: { id: itemId } });
  await Promise.all([deleteUploadByUrl(item.imageUrl), deleteUploadByUrl(item.faviconUrl)]);
}

export async function reorderItems(userId: string, shelfId: string, input: z.infer<typeof reorderSchema>) {
  await assertShelfOwner(userId, shelfId);
  const existing = await db.item.findMany({ where: { shelfId }, select: { id: true } });
  const ids = new Set(existing.map((i) => i.id));
  if (input.itemIds.length !== ids.size || new Set(input.itemIds).size !== ids.size || !input.itemIds.every((id) => ids.has(id))) {
    throw new AppError("BAD_REQUEST", "The item list doesn't match this shelf");
  }
  await db.$transaction(input.itemIds.map((id, position) => db.item.update({ where: { id }, data: { position } })));
}

/** Fill in a missing thumbnail/favicon for a link item (owner-triggered or admin backfill). */
export type ThumbnailMode = "missing" | "auto" | "candidate";

/**
 * Owner action on a link item's picture.
 *  - missing:   only fill it in when there is none (quiet retry from the profile page)
 *  - auto:      re-run the whole extraction and use the best image (also "revert to the link photo")
 *  - candidate: use the image the owner picked from the candidate list
 */
export async function refreshItemThumbnail(itemId: string, opts: { userId?: string; mode?: ThumbnailMode; imageUrl?: string } = {}) {
  const mode = opts.mode ?? "missing";
  const item = opts.userId ? await assertItemOwner(opts.userId, itemId) : await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError("NOT_FOUND", "Item not found");
  if (item.type !== "LINK" || !item.url) return item;
  if (mode === "missing" && item.imageUrl) return item;
  if (mode === "candidate" && !opts.imageUrl) throw new AppError("BAD_REQUEST", "Choose an image");
  const resolved = await resolveLinkPreview(item.url, { fresh: true, alternatives: 0 });
  const { imageUrl, faviconUrl } = await resolveThumbnail(resolved, { prefer: mode === "candidate" ? opts.imageUrl : null });
  if (!imageUrl && !faviconUrl) return item;
  if (mode === "candidate" && !imageUrl) throw new AppError("UNPROCESSABLE", "That image couldn't be loaded");
  const updated = await db.item.update({
    where: { id: item.id },
    data: { imageUrl: imageUrl ?? item.imageUrl, faviconUrl: item.faviconUrl ?? faviconUrl },
  });
  if (imageUrl && item.imageUrl && item.imageUrl !== imageUrl) await deleteUploadByUrl(item.imageUrl);
  return updated;
}

/** Owner picks their own photo for a link or photo item (replaces the stored picture). */
export async function setItemPhoto(userId: string, itemId: string, file: Buffer) {
  const item = await assertItemOwner(userId, itemId);
  const imageUrl = await saveUploadedImage(file);
  const updated = await db.item.update({ where: { id: item.id }, data: { imageUrl } });
  await deleteUploadByUrl(item.imageUrl);
  return updated;
}

/** Verified candidate images for the owner's "pick a different photo" picker. */
export async function itemThumbnailOptions(userId: string, itemId: string) {
  const item = await assertItemOwner(userId, itemId);
  if (item.type !== "LINK" || !item.url) return { candidates: [] };
  const { best, alternatives } = await resolveLinkPreview(item.url, { alternatives: 7 });
  return { candidates: [best, ...alternatives].filter(Boolean).map((c) => ({ url: c!.url, width: c!.width, height: c!.height, source: c!.source, thumb: c!.thumb })) };
}

export interface BackfillOptions {
  limit?: number;
  /** "missing" (default) = only items with no image; "all" = re-run every link item (cursor-paged by createdAt/id). */
  scope?: "missing" | "all";
  after?: string;
  dryRun?: boolean;
}

/** Backfill / re-run thumbnails for link items. Returns counts and a per-item report (no secrets). */
export async function backfillThumbnails(opts: BackfillOptions | number = {}) {
  const o: BackfillOptions = typeof opts === "number" ? { limit: opts } : opts;
  const scope = o.scope ?? "missing";
  const items = await db.item.findMany({
    where: { type: "LINK", url: { not: null }, ...(scope === "missing" ? { imageUrl: null } : {}), ...(o.after ? { id: { gt: o.after } } : {}) },
    orderBy: { id: "asc" },
    take: o.limit ?? 10,
  });
  let fixed = 0;
  const report: Array<{ id: string; url: string | null; before: string | null; after: string | null; changed: boolean }> = [];
  for (const it of items) {
    try {
      const after = o.dryRun ? it : await refreshItemThumbnail(it.id, { mode: scope === "all" ? "auto" : "missing" });
      if (after.imageUrl) fixed++;
      report.push({ id: it.id, url: it.url, before: it.imageUrl, after: after.imageUrl, changed: after.imageUrl !== it.imageUrl });
    } catch {
      report.push({ id: it.id, url: it.url, before: it.imageUrl, after: null, changed: false });
    }
  }
  return { checked: items.length, fixed, next: items.length === (o.limit ?? 10) ? items[items.length - 1]?.id : null, report };
}
