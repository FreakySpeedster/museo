import { db } from "../db";
import { advisoryLock } from "../locks";
import { AppError } from "../errors";
import { canAddShelf, MAX_SHELVES_PER_PAGE } from "../limits";
import { releaseUploads } from "./items";
import { shelfSchema, shelfUpdateSchema } from "../validation";
import type { z } from "zod";

export async function assertShelfOwner(userId: string, shelfId: string) {
  const shelf = await db.shelf.findUnique({ where: { id: shelfId }, include: { page: true } });
  if (!shelf) throw new AppError("NOT_FOUND", "Collection not found");
  if (shelf.page.userId !== userId) throw new AppError("FORBIDDEN", "That collection belongs to someone else");
  return shelf;
}

/** Create a shelf. Enforced server-side: at most 5 shelves per page. */
export async function createShelf(userId: string, pageId: string, input: z.infer<typeof shelfSchema>) {
  return db.$transaction(async (tx) => {
    // Serialise concurrent creates for this page (advisory lock is released on commit).
    await advisoryLock(tx, `page:${pageId}`);
    const page = await tx.page.findUnique({ where: { id: pageId }, select: { userId: true } });
    if (!page) throw new AppError("NOT_FOUND", "Page not found");
    if (page.userId !== userId) throw new AppError("FORBIDDEN", "That page belongs to someone else");
    const count = await tx.shelf.count({ where: { pageId } });
    if (!canAddShelf(count)) {
      throw new AppError("SHELF_LIMIT", `A page can hold at most ${MAX_SHELVES_PER_PAGE} collections`);
    }
    return tx.shelf.create({
      data: { pageId, name: input.name, category: input.category, position: count, visibility: input.visibility ?? "public" },
      include: { items: true },
    });
  });
}

export async function updateShelf(userId: string, shelfId: string, input: z.infer<typeof shelfUpdateSchema>) {
  await assertShelfOwner(userId, shelfId);
  return db.shelf.update({ where: { id: shelfId }, data: input, include: { items: { orderBy: { position: "asc" } } } });
}

export async function deleteShelf(userId: string, shelfId: string) {
  await assertShelfOwner(userId, shelfId);
  const items = await db.item.findMany({ where: { shelfId }, select: { imageUrl: true, faviconUrl: true, images: true } });
  await db.shelf.delete({ where: { id: shelfId } });
  await releaseUploads(items.flatMap((i) => [i.imageUrl, i.faviconUrl, ...(i.images ?? [])]));
}

/** Move a whole shelf (with its items) to another of the owner's pages. nook Plus only; respects the target's shelf limit. */
export async function moveShelfToPage(userId: string, shelfId: string, targetPageId: string) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { subscribed: true } });
    if (!user?.subscribed) throw new AppError("PAYWALL", "Moving collections between pages is a nook Plus feature.");
    const shelf = await tx.shelf.findUnique({ where: { id: shelfId }, include: { page: { select: { userId: true } } } });
    if (!shelf) throw new AppError("NOT_FOUND", "Collection not found");
    if (shelf.page.userId !== userId) throw new AppError("FORBIDDEN", "That collection belongs to someone else");
    if (shelf.pageId === targetPageId) throw new AppError("BAD_REQUEST", "The collection is already on that page");
    // Lock both pages in a stable order to avoid deadlocks with concurrent creates/moves.
    for (const id of [shelf.pageId, targetPageId].sort()) await advisoryLock(tx, `page:${id}`);
    const target = await tx.page.findUnique({ where: { id: targetPageId }, select: { userId: true, title: true } });
    if (!target) throw new AppError("NOT_FOUND", "Page not found");
    if (target.userId !== userId) throw new AppError("FORBIDDEN", "That page belongs to someone else");
    const count = await tx.shelf.count({ where: { pageId: targetPageId } });
    if (!canAddShelf(count)) {
      throw new AppError("SHELF_LIMIT", `"${target.title}" already has ${MAX_SHELVES_PER_PAGE} collections`);
    }
    const moved = await tx.shelf.update({
      where: { id: shelfId },
      data: { pageId: targetPageId, position: count },
      include: { items: { orderBy: { position: "asc" } } },
    });
    // Close the gap on the source page.
    const rest = await tx.shelf.findMany({ where: { pageId: shelf.pageId }, orderBy: { position: "asc" }, select: { id: true } });
    await Promise.all(rest.map((s, i) => tx.shelf.update({ where: { id: s.id }, data: { position: i } })));
    return moved;
  });
}
