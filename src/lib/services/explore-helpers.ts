import { db } from "../db";
export { decorateEntries } from "./feed";

/** The viewer's collections that already hold this thing. */
export async function ownedCopiesForKey(viewerId: string, key: string) {
  const rows = await db.item.findMany({ where: { userId: viewerId, canonicalKey: key }, select: { shelf: { select: { id: true, name: true } } } });
  return [...new Map(rows.map((r) => [r.shelf.id, { shelfId: r.shelf.id, shelfName: r.shelf.name }])).values()];
}
