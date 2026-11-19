import { z } from "zod";
import { db } from "../db";
import { AppError } from "../errors";
import { canViewItem } from "../visibility";
import { canonicalKeyFor } from "../canonical";
import { itemLimit } from "../limits";
import { insertItem } from "./items";
import { createShelf } from "./shelves";

/** "Add to my collection": copy someone else's item into one of your collections, linked to the original. */

export const collectSchema = z.union([
  z.object({ shelfId: z.string().min(1).max(40) }),
  z.object({ newShelf: z.object({ name: z.string().trim().min(1, "Name your collection").max(40) }) }),
]);

async function loadSource(itemId: string, viewerId: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, include: { shelf: { include: { page: true } } } });
  if (!item || !canViewItem(item, viewerId)) throw new AppError("NOT_FOUND", "That item is gone.");
  return item;
}

/** The grouping key, computed (and stored) on the fly for rows created before keys existed. */
async function keyOf(item: { id: string; type: string; url: string | null; title: string; canonicalKey: string | null }) {
  if (item.canonicalKey) return item.canonicalKey;
  const key = canonicalKeyFor(item);
  if (key) await db.item.update({ where: { id: item.id }, data: { canonicalKey: key } });
  return key;
}

/** Where the viewer already keeps this thing (any of their items with the same key or copied from it). */
export async function ownedCopies(viewerId: string, item: { id: string; canonicalKey: string | null; sourceItemId?: string | null }) {
  const or: object[] = [{ sourceItemId: item.sourceItemId ?? item.id }, { id: item.sourceItemId ?? item.id }];
  if (item.canonicalKey) or.push({ canonicalKey: item.canonicalKey });
  const rows = await db.item.findMany({ where: { userId: viewerId, OR: or }, select: { id: true, shelf: { select: { id: true, name: true } } } });
  const seen = new Map<string, { shelfId: string; shelfName: string; itemId: string }>();
  for (const r of rows) if (!seen.has(r.shelf.id)) seen.set(r.shelf.id, { shelfId: r.shelf.id, shelfName: r.shelf.name, itemId: r.id });
  return [...seen.values()];
}

/** Everything the picker sheet needs: the viewer's collections grouped by page, with full / already-there flags. */
export async function collectTargets(viewerId: string, itemId: string) {
  const src = await loadSource(itemId, viewerId);
  const key = await keyOf(src);
  const [user, pages, owned] = await Promise.all([
    db.user.findUnique({ where: { id: viewerId }, select: { subscribed: true } }),
    db.page.findMany({
      where: { userId: viewerId },
      orderBy: { position: "asc" },
      select: { id: true, title: true, shelves: { orderBy: { position: "asc" }, select: { id: true, name: true, category: true, _count: { select: { items: true } } } } },
    }),
    ownedCopies(viewerId, { ...src, canonicalKey: key }),
  ]);
  const limit = itemLimit(Boolean(user?.subscribed));
  const already = new Set(owned.map((o) => o.shelfId));
  return {
    isOwner: src.userId === viewerId,
    subscribed: Boolean(user?.subscribed),
    limit,
    suggestedCategory: src.shelf.category,
    owned,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      shelves: p.shelves.map((s) => ({ id: s.id, name: s.name, category: s.category, itemCount: s._count.items, full: s._count.items >= limit, already: already.has(s.id) })),
    })),
  };
}

export async function collectItem(viewerId: string, itemId: string, input: z.infer<typeof collectSchema>) {
  const src = await loadSource(itemId, viewerId);
  if (src.userId === viewerId) throw new AppError("CONFLICT", "This is already in your collection");
  const key = await keyOf(src);

  let shelfId: string;
  let shelfName: string;
  if ("newShelf" in input) {
    const page = await db.page.findFirst({ where: { userId: viewerId }, orderBy: { position: "asc" }, select: { id: true } });
    if (!page) throw new AppError("BAD_REQUEST", "Create a page first");
    const shelf = await createShelf(viewerId, page.id, { name: input.newShelf.name, category: src.shelf.category });
    shelfId = shelf.id;
    shelfName = shelf.name;
  } else {
    const shelf = await db.shelf.findUnique({ where: { id: input.shelfId }, select: { id: true, name: true, page: { select: { userId: true } } } });
    if (!shelf) throw new AppError("NOT_FOUND", "Collection not found");
    if (shelf.page.userId !== viewerId) throw new AppError("FORBIDDEN", "That collection belongs to someone else");
    shelfId = shelf.id;
    shelfName = shelf.name;
  }

  const dupe = (await ownedCopies(viewerId, { ...src, canonicalKey: key })).find((o) => o.shelfId === shelfId);
  if (dupe) throw new AppError("CONFLICT", `Already in ${shelfName}`, { shelfId, itemId: dupe.itemId });

  const item = await insertItem(viewerId, shelfId, {
    type: src.type,
    url: src.url,
    imageUrl: src.imageUrl,
    images: src.images,
    faviconUrl: src.faviconUrl,
    title: src.title,
    description: src.description,
    siteName: src.siteName,
    tags: src.tags,
    imageWidth: src.imageWidth,
    imageHeight: src.imageHeight,
    canonicalKey: key,
    sourceItemId: src.sourceItemId ?? src.id,
  });
  return { item: { id: item.id, shelfId }, shelf: { id: shelfId, name: shelfName } };
}
