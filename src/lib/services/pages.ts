import { db } from "../db";
import { withLock } from "../mutex";
import { AppError } from "../errors";
import { pageCreationGate } from "../limits";
import { deleteUploadByUrl } from "../uploads";
import { pageSchema, pageUpdateSchema } from "../validation";
import type { z } from "zod";

export async function listPages(userId: string) {
  return db.page.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { shelves: { orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" } } } } },
  });
}

export async function assertPageOwner(userId: string, pageId: string) {
  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) throw new AppError("NOT_FOUND", "Page not found");
  if (page.userId !== userId) throw new AppError("FORBIDDEN", "That page belongs to someone else");
  return page;
}

/** Create a page. The first page is free; further pages require an active subscription. */
export async function createPage(userId: string, input: z.infer<typeof pageSchema>) {
  return withLock(`user:${userId}`, () => createPageLocked(userId, input));
}

async function createPageLocked(userId: string, input: z.infer<typeof pageSchema>) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("UNAUTHORIZED", "Please sign in to continue");
    const pageCount = await tx.page.count({ where: { userId } });
    const gate = pageCreationGate({ subscribed: user.subscribed, pageCount });
    if (!gate.allowed) {
      if (gate.reason === "PAYWALL") {
        throw new AppError("PAYWALL", "Your first page is free. Upgrade to Shelfie Plus to create more pages.");
      }
      throw new AppError("UNPROCESSABLE", "You've reached the maximum number of pages");
    }
    return tx.page.create({
      data: { userId, title: input.title, description: input.description, emoji: input.emoji, position: pageCount },
      include: { shelves: true },
    });
  });
}

export async function updatePage(userId: string, pageId: string, input: z.infer<typeof pageUpdateSchema>) {
  await assertPageOwner(userId, pageId);
  return db.page.update({ where: { id: pageId }, data: input, include: { shelves: true } });
}

export async function deletePage(userId: string, pageId: string) {
  await assertPageOwner(userId, pageId);
  if ((await db.page.count({ where: { userId } })) <= 1) {
    throw new AppError("UNPROCESSABLE", "You need at least one page. Edit it instead, or create another first.");
  }
  const items = await db.item.findMany({ where: { shelf: { pageId } }, select: { imageUrl: true, faviconUrl: true } });
  await db.page.delete({ where: { id: pageId } });
  await Promise.all(items.flatMap((i) => [deleteUploadByUrl(i.imageUrl), deleteUploadByUrl(i.faviconUrl)]));
}
