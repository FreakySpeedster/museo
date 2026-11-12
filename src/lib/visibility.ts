export type Visibility = "public" | "private";

export const isPublic = (v?: string | null) => v !== "private";

/** Prisma filter: item and its shelf and page are all public. */
export const publicItemFilter = {
  visibility: "public",
  shelf: { visibility: "public", page: { visibility: "public" } },
} as const;

/** Items the viewer may see: their own (including private) or fully public ones. */
export function itemVisibleWhere(viewerId?: string | null) {
  if (!viewerId) return { ...publicItemFilter };
  return { OR: [{ userId: viewerId }, { ...publicItemFilter }] };
}

export function canViewItem(
  row: {
    userId: string;
    visibility: string;
    shelf: { visibility: string; page: { visibility: string } };
  },
  viewerId?: string | null,
): boolean {
  if (viewerId && viewerId === row.userId) return true;
  return isPublic(row.visibility) && isPublic(row.shelf.visibility) && isPublic(row.shelf.page.visibility);
}

export function canViewPage(page: { userId: string; visibility: string }, viewerId?: string | null): boolean {
  return (viewerId && viewerId === page.userId) || isPublic(page.visibility);
}

export function canViewShelf(
  shelf: { visibility: string; page: { userId: string; visibility: string } },
  viewerId?: string | null,
): boolean {
  if (viewerId && viewerId === shelf.page.userId) return true;
  return isPublic(shelf.visibility) && isPublic(shelf.page.visibility);
}
