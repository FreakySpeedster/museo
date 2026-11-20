import { db } from "../db";
import { canViewItem } from "../visibility";
import { toTimelineEntry } from "../mappers";
import { decorateEntries } from "./feed";
import { AppError } from "../errors";
import { downloadImage, resolveLinkPreview, resolveThumbnail } from "../link-preview";

export const MAX_ITEM_PHOTOS = 6;
import { deleteUploadByUrl, saveUploadedImage } from "../uploads";
import { itemCreateLinkSchema, itemTextSchema, itemUpdateSchema, reorderSchema } from "../validation";
import { assertShelfOwner } from "./shelves";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { advisoryLock } from "../locks";
import { canonicalKeyFor } from "../canonical";
import { probeImageDims } from "../image-dims";
import { assertReputation, validateDestination, validateItemUrl } from "../net/url-safety";
import { REPORT_HIDE_THRESHOLD, URL_EDIT_LIMIT, type ReportReason } from "../link-policy";
import { rateLimit } from "../rate-limit";
import { FREE_ITEMS_PER_SHELF, MAX_MANUAL_PHOTOS, PLUS_ITEMS_PER_SHELF, itemCreationGate, type ItemGate } from "../limits";

export const MAX_ITEMS_PER_SHELF = PLUS_ITEMS_PER_SHELF;

function gateError(gate: Exclude<ItemGate, { allowed: true }>) {
  return gate.reason === "ITEM_LIMIT"
    ? new AppError("ITEM_LIMIT", `Free collections hold up to ${FREE_ITEMS_PER_SHELF} items. Upgrade to Museo Plus for unlimited items.`, { limit: FREE_ITEMS_PER_SHELF })
    : new AppError("UNPROCESSABLE", `A collection can hold at most ${PLUS_ITEMS_PER_SHELF} items`);
}

/** Fast pre-check (before slow link fetching / uploads). The authoritative check runs in insertItem. */
export async function assertCanAddItem(userId: string, shelfId: string) {
  const [user, itemCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { subscribed: true } }),
    db.item.count({ where: { shelfId } }),
  ]);
  const gate = itemCreationGate({ subscribed: Boolean(user?.subscribed), itemCount });
  if (!gate.allowed) throw gateError(gate);
}

/** Insert at the end of the collection under a per-collection lock, so the plan limit can't be raced past. */
export async function insertItem(userId: string, shelfId: string, data: Omit<Prisma.ItemUncheckedCreateInput, "position" | "shelfId" | "userId">) {
  // Grouping key + cover size, so Explore can count owners and feeds can reserve the photo's space.
  if (data.canonicalKey === undefined) data = { ...data, canonicalKey: canonicalKeyFor({ type: data.type, url: data.url, title: data.title }) };
  if (data.imageWidth === undefined && data.imageUrl) {
    const dims = await probeImageDims(data.imageUrl);
    if (dims) data = { ...data, imageWidth: dims.width, imageHeight: dims.height };
  }
  return db.$transaction(async (tx) => {
    await advisoryLock(tx, `shelf:${shelfId}`);
    const [user, itemCount] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { subscribed: true } }),
      tx.item.count({ where: { shelfId } }),
    ]);
    const gate = itemCreationGate({ subscribed: Boolean(user?.subscribed), itemCount });
    if (!gate.allowed) throw gateError(gate);
    return tx.item.create({ data: { ...data, shelfId, userId, position: itemCount } });
  });
}

/**
 * Shared create/edit gate: validate the pasted link, follow it to its real destination (expanding short links),
 * re-validate that destination and run the reputation check on both. Returns the preview for the destination.
 */
async function resolveSafeLink(raw: string, opts: { fresh?: boolean } = {}) {
  const pasted = validateItemUrl(raw).toString();
  const resolved = await resolveLinkPreview(pasted, opts);
  const dest = validateDestination(resolved.preview.url).toString();
  const linkCheck = await assertReputation([pasted, dest]);
  return { resolved: { ...resolved, preview: { ...resolved.preview, url: dest } }, linkCheck };
}

export async function createLinkItem(
  userId: string,
  shelfId: string,
  input: z.infer<typeof itemCreateLinkSchema>,
  opts: { imageUrl?: string; photo?: Buffer; extraImageUrls?: string[] } = {},
) {
  await assertShelfOwner(userId, shelfId);
  await assertCanAddItem(userId, shelfId);
  // The user's own photo wins; then a candidate they picked; otherwise the best verified image from the page.
  const { resolved, linkCheck } = await resolveSafeLink(input.url);
  const own = opts.photo ? await saveUploadedImage(opts.photo) : null;
  const { preview } = resolved;
  const thumb = own ? { imageUrl: own, faviconUrl: (await resolveThumbnail({ ...resolved, best: null, alternatives: [] })).faviconUrl } : await resolveThumbnail(resolved, { prefer: opts.imageUrl });
  const { imageUrl, faviconUrl } = thumb;
  // Extra photos the user picked: stored locally in parallel, unusable ones are dropped.
  let referer: string | undefined;
  try {
    referer = new URL(preview.url).origin + "/";
  } catch {
    /* ignore */
  }
  const extras = [...new Set(opts.extraImageUrls ?? [])].filter((u) => u !== opts.imageUrl).slice(0, MAX_ITEM_PHOTOS - 1);
  const images = (await Promise.all(extras.map((u) => downloadImage(u, referer).catch(() => null)))).filter((u): u is string => Boolean(u) && u !== imageUrl);
  let host = preview.siteName;
  try {
    host = host || new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const title = input.title || preview.title || host || "Untitled link";
  const description = input.description || preview.description;
  return insertItem(userId, shelfId, {
    type: "LINK",
    url: preview.url,
    originalUrl: preview.url,
    linkCheck,
    imageUrl,
    images,
    faviconUrl,
    title: title.slice(0, 120),
    description: description.slice(0, 500),
    siteName: host || null,
    tags: input.tags ?? [],
  });
}

export async function createPhotoItem(
  userId: string,
  shelfId: string,
  input: z.infer<typeof itemTextSchema>,
  files: Buffer | Buffer[],
) {
  const list = Array.isArray(files) ? files : [files];
  await assertShelfOwner(userId, shelfId);
  if (!input.title) throw new AppError("BAD_REQUEST", "Title is required");
  if (list.length === 0) throw new AppError("BAD_REQUEST", "Choose a photo to upload");
  if (list.length > MAX_MANUAL_PHOTOS) throw new AppError("BAD_REQUEST", `Add up to ${MAX_MANUAL_PHOTOS} photos`);
  await assertCanAddItem(userId, shelfId);
  const saved: string[] = [];
  try {
    for (const f of list) saved.push(await saveUploadedImage(f));
    const [imageUrl, ...images] = saved;
    return await insertItem(userId, shelfId, { type: "PHOTO", imageUrl, images, title: input.title, description: input.description, tags: input.tags ?? [] });
  } catch (e) {
    await Promise.all(saved.map((u) => deleteUploadByUrl(u)));
    throw e;
  }
}

async function dimsData(url: string) {
  const d = await probeImageDims(url);
  return { imageWidth: d?.width ?? null, imageHeight: d?.height ?? null };
}

async function assertItemOwner(userId: string, itemId: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, include: { shelf: { include: { page: true } } } });
  if (!item) throw new AppError("NOT_FOUND", "Item not found");
  if (item.shelf.page.userId !== userId) throw new AppError("FORBIDDEN", "That item belongs to someone else");
  return item;
}

export async function updateItem(userId: string, itemId: string, input: z.infer<typeof itemUpdateSchema>) {
  const item = await assertItemOwner(userId, itemId);
  // A renamed photo item is a different "thing"; copies keep the original's grouping.
  const rekey = input.title && input.title !== item.title && item.type === "PHOTO" && !item.sourceItemId;
  return db.item.update({ where: { id: itemId }, data: rekey ? { ...input, canonicalKey: canonicalKeyFor({ type: item.type, url: item.url, title: input.title! }) } : input });
}

/**
 * Owner changes a link item's source URL. Same safety gate as create; the photo, favicon and source are
 * re-fetched from the new page, the first URL is kept in originalUrl and the post shows "Link edited".
 * The title follows the new page unless the owner typed a new one in the same edit.
 */
export async function updateItemUrl(userId: string, itemId: string, rawUrl: string, opts: { title?: string } = {}) {
  const item = await assertItemOwner(userId, itemId);
  if (item.type !== "LINK") throw new AppError("BAD_REQUEST", "Only link posts have a link to edit");
  const pasted = validateItemUrl(rawUrl).toString();
  if (pasted === item.url) return { item, changed: false };
  const rl = await rateLimit(`item-url-edit:${userId}`, URL_EDIT_LIMIT.max, URL_EDIT_LIMIT.windowMs);
  if (!rl.ok) throw new AppError("RATE_LIMITED", `You've changed links a lot recently. Try again in ${Math.ceil(rl.retryAfter / 60)} min.`);
  const { resolved, linkCheck } = await resolveSafeLink(pasted, { fresh: true });
  const { preview } = resolved;
  if (preview.url === item.url) return { item, changed: false };
  const { imageUrl, faviconUrl } = await resolveThumbnail(resolved);
  let host = preview.siteName;
  try {
    host = host || new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const ownTitle = opts.title?.trim() && opts.title.trim() !== item.title ? opts.title.trim() : null;
  const title = (ownTitle || preview.title || item.title).slice(0, 120);
  const updated = await db.item.update({
    where: { id: item.id },
    data: {
      url: preview.url,
      originalUrl: item.originalUrl ?? item.url,
      urlEditedAt: new Date(),
      linkCheck,
      title,
      siteName: host || null,
      faviconUrl,
      imageUrl,
      images: [],
      ...(imageUrl ? await dimsData(imageUrl) : { imageWidth: null, imageHeight: null }),
      ...(item.sourceItemId ? {} : { canonicalKey: canonicalKeyFor({ type: "LINK", url: preview.url, title }) }),
    },
  });
  await releaseUploads([item.imageUrl, item.faviconUrl, ...item.images].filter((u) => u !== imageUrl && u !== faviconUrl));
  return { item: updated, changed: true };
}

/**
 * "Report link": one report per person per item (repeats are no-ops). Owners can't report themselves.
 * At REPORT_HIDE_THRESHOLD distinct reports the link is gated behind a warning interstitial.
 */
export async function reportItemLink(userId: string, itemId: string, reason: ReportReason) {
  const item = await db.item.findUnique({ where: { id: itemId }, include: { shelf: { include: { page: true } } } });
  if (!item || !canViewItem(item, userId)) throw new AppError("NOT_FOUND", "That item is gone.");
  if (item.userId === userId) throw new AppError("BAD_REQUEST", "You can't report your own post");
  return db.$transaction(async (tx) => {
    const created = await tx.itemReport.createMany({ data: [{ itemId, reporterId: userId, reason }], skipDuplicates: true });
    const row = created.count
      ? await tx.item.update({ where: { id: itemId }, data: { reportCount: { increment: 1 } }, select: { reportCount: true } })
      : await tx.item.findUniqueOrThrow({ where: { id: itemId }, select: { reportCount: true } });
    return { reported: true, alreadyReported: created.count === 0, hidden: row.reportCount >= REPORT_HIDE_THRESHOLD };
  });
}

/**
 * Delete stored files no remaining item still points at. Copies made with "Add to my collection"
 * share the original's photos, so a file is only removed once its last user is gone.
 */
export async function releaseUploads(urls: Array<string | null | undefined>) {
  const list = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  if (list.length === 0) return;
  const used = await db.item.findMany({
    where: { OR: [{ imageUrl: { in: list } }, { faviconUrl: { in: list } }, { images: { hasSome: list } }] },
    select: { imageUrl: true, faviconUrl: true, images: true },
  });
  const keep = new Set(used.flatMap((i) => [i.imageUrl, i.faviconUrl, ...i.images]));
  await Promise.all(list.filter((u) => !keep.has(u)).map((u) => deleteUploadByUrl(u)));
}

export async function deleteItem(userId: string, itemId: string) {
  const item = await assertItemOwner(userId, itemId);
  await db.item.delete({ where: { id: itemId } });
  await releaseUploads([item.imageUrl, item.faviconUrl, ...item.images]);
}

export async function reorderItems(userId: string, shelfId: string, input: z.infer<typeof reorderSchema>) {
  await assertShelfOwner(userId, shelfId);
  const existing = await db.item.findMany({ where: { shelfId }, select: { id: true } });
  const ids = new Set(existing.map((i) => i.id));
  if (input.itemIds.length !== ids.size || new Set(input.itemIds).size !== ids.size || !input.itemIds.every((id) => ids.has(id))) {
    throw new AppError("BAD_REQUEST", "The item list doesn't match this collection");
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
    data: { imageUrl: imageUrl ?? item.imageUrl, faviconUrl: item.faviconUrl ?? faviconUrl, ...(imageUrl && imageUrl !== item.imageUrl ? await dimsData(imageUrl) : {}) },
  });
  if (imageUrl && item.imageUrl && item.imageUrl !== imageUrl) await releaseUploads([item.imageUrl]);
  return updated;
}

/** Owner picks their own photo for a link or photo item (replaces the stored picture). */
export async function setItemPhoto(userId: string, itemId: string, file: Buffer) {
  const item = await assertItemOwner(userId, itemId);
  const imageUrl = await saveUploadedImage(file);
  const updated = await db.item.update({ where: { id: item.id }, data: { imageUrl, ...(await dimsData(imageUrl)) } });
  await releaseUploads([item.imageUrl]);
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

export async function getVisibleItem(id: string, viewerId?: string | null) {
  const item = await db.item.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, socialLinks: true } },
      shelf: { include: { page: true } },
    },
  });
  if (!item || !canViewItem(item, viewerId)) throw new AppError("NOT_FOUND", "That item is gone.");
  const [entry] = await decorateEntries([toTimelineEntry(item)], viewerId);
  return entry;
}
