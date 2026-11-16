/** Business rules, kept as pure functions so they are trivially testable. */
export const MAX_SHELVES_PER_PAGE = 5;
export const FREE_PAGE_LIMIT = 1;
export const MAX_PAGES_PER_USER = 25;
/** Items per collection: free accounts get 10; Plus is effectively unlimited (a hard safety cap). */
export const FREE_ITEMS_PER_SHELF = 10;
export const PLUS_ITEMS_PER_SHELF = 200;
/** Photos on a manually added (photo) item. */
export const MAX_MANUAL_PHOTOS = 3;

export function itemLimit(subscribed: boolean): number {
  return subscribed ? PLUS_ITEMS_PER_SHELF : FREE_ITEMS_PER_SHELF;
}

export type ItemGate = { allowed: true } | { allowed: false; reason: "ITEM_LIMIT" | "MAX_ITEMS" };

export function itemCreationGate(opts: { subscribed: boolean; itemCount: number }): ItemGate {
  if (opts.itemCount >= PLUS_ITEMS_PER_SHELF) return { allowed: false, reason: "MAX_ITEMS" };
  if (!opts.subscribed && opts.itemCount >= FREE_ITEMS_PER_SHELF) return { allowed: false, reason: "ITEM_LIMIT" };
  return { allowed: true };
}

export function canAddShelf(currentShelfCount: number): boolean {
  return currentShelfCount < MAX_SHELVES_PER_PAGE;
}

export type PageGate =
  | { allowed: true }
  | { allowed: false; reason: "PAYWALL" | "MAX_PAGES" };

export function pageCreationGate(opts: { subscribed: boolean; pageCount: number }): PageGate {
  if (opts.pageCount >= MAX_PAGES_PER_USER) return { allowed: false, reason: "MAX_PAGES" };
  if (!opts.subscribed && opts.pageCount >= FREE_PAGE_LIMIT) {
    return { allowed: false, reason: "PAYWALL" };
  }
  return { allowed: true };
}
