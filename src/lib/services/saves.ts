import { db } from "../db";
import { AppError } from "../errors";
import { publicUserSelect, toTimelineEntry } from "../mappers";
import { canViewItem, itemVisibleWhere } from "../visibility";
import type { TimelineEntry } from "../dto";

/**
 * The private "Want" list. A user can save any item they can see (their own or anyone's public item).
 * Saves are never exposed to anyone but the saver: no public counts, no notifications.
 */

export const SAVED_PAGE_SIZE = 24;
/** Generous ceiling so one account can't grow the table without bound. */
export const SAVED_MAX = 5000;

export interface SavedEntry extends TimelineEntry {
  savedAt: string;
}

/** Idempotent: saving twice or unsaving something not saved is fine. */
export async function setSaved(userId: string, itemId: string, saved: boolean): Promise<{ savedByMe: boolean }> {
  if (!saved) {
    // Unsaving never needs the item to be visible (it may have gone private since).
    await db.savedItem.deleteMany({ where: { userId, itemId } });
    return { savedByMe: false };
  }
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: { userId: true, visibility: true, shelf: { select: { visibility: true, page: { select: { visibility: true } } } } },
  });
  if (!item || !canViewItem(item, userId)) throw new AppError("NOT_FOUND", "That item is gone.");
  const existing = await db.savedItem.findUnique({ where: { userId_itemId: { userId, itemId } }, select: { itemId: true } });
  if (existing) return { savedByMe: true };
  if ((await db.savedItem.count({ where: { userId } })) >= SAVED_MAX) {
    throw new AppError("UNPROCESSABLE", `Your Want list is full (${SAVED_MAX.toLocaleString("en-US")} items). Remove a few to save more.`);
  }
  await db.savedItem.upsert({ where: { userId_itemId: { userId, itemId } }, create: { userId, itemId }, update: {} });
  return { savedByMe: true };
}

/** Which of these items the viewer has saved (one query). */
export async function savedIdsFor(viewerId: string | null | undefined, itemIds: string[]): Promise<Set<string>> {
  if (!viewerId || itemIds.length === 0) return new Set();
  const rows = await db.savedItem.findMany({ where: { userId: viewerId, itemId: { in: itemIds } }, select: { itemId: true } });
  return new Set(rows.map((r) => r.itemId));
}

function decodeCursor(c?: string | null): { at: Date; itemId: string } | null {
  if (!c) return null;
  const i = c.indexOf("_");
  if (i < 1) return null;
  const at = new Date(Number(c.slice(0, i)));
  const itemId = c.slice(i + 1);
  return itemId && !Number.isNaN(at.getTime()) ? { at, itemId } : null;
}

/** The owner's Want list, newest save first. Items that are no longer visible to them are skipped. */
export async function listSaved(userId: string, cursor?: string | null, limit = SAVED_PAGE_SIZE): Promise<{ items: SavedEntry[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(1, limit), 60);
  const c = decodeCursor(cursor);
  const rows = await db.savedItem.findMany({
    where: {
      userId,
      item: itemVisibleWhere(userId),
      ...(c ? { OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, itemId: { lt: c.itemId } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { itemId: "desc" }],
    take: take + 1,
    select: {
      createdAt: true,
      itemId: true,
      item: { include: { user: { select: publicUserSelect }, shelf: { include: { page: true } } } },
    },
  });
  const page = rows.slice(0, take);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ ...toTimelineEntry(r.item), likeCount: 0, commentCount: 0, likedByMe: false, savedByMe: true, savedAt: r.createdAt.toISOString() })),
    nextCursor: rows.length > take && last ? `${last.createdAt.getTime()}_${last.itemId}` : null,
  };
}

/** How many people saved the owner's own item (shown to the owner only). */
export async function savedCountForOwner(ownerId: string, itemId: string): Promise<number | null> {
  const item = await db.item.findUnique({ where: { id: itemId }, select: { userId: true } });
  if (!item || item.userId !== ownerId) return null;
  return db.savedItem.count({ where: { itemId } });
}
