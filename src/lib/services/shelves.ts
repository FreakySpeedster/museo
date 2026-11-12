import { db } from "../db";
import { advisoryLock } from "../locks";
import { AppError } from "../errors";
import { canAddShelf, MAX_SHELVES_PER_PAGE } from "../limits";
import { deleteUploadByUrl } from "../uploads";
import { shelfSchema, shelfUpdateSchema } from "../validation";
import type { z } from "zod";

export async function assertShelfOwner(userId: string, shelfId: string) {
  const shelf = await db.shelf.findUnique({ where: { id: shelfId }, include: { page: true } });
  if (!shelf) throw new AppError("NOT_FOUND", "Shelf not found");
  if (shelf.page.userId !== userId) throw new AppError("FORBIDDEN", "That shelf belongs to someone else");
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
      throw new AppError("SHELF_LIMIT", `A page can hold at most ${MAX_SHELVES_PER_PAGE} shelves`);
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
  const items = await db.item.findMany({ where: { shelfId }, select: { imageUrl: true, faviconUrl: true } });
  await db.shelf.delete({ where: { id: shelfId } });
  await Promise.all(items.flatMap((i) => [deleteUploadByUrl(i.imageUrl), deleteUploadByUrl(i.faviconUrl)]));
}
