import { db } from "../db";
import { AppError } from "../errors";
import { getLinkPreview, resolveThumbnail } from "../link-preview";
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

export async function createLinkItem(userId: string, shelfId: string, input: z.infer<typeof itemCreateLinkSchema>) {
  await assertShelfOwner(userId, shelfId);
  const position = await nextPosition(shelfId);
  const preview = await getLinkPreview(input.url);
  const { imageUrl, faviconUrl } = await resolveThumbnail(preview);
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
