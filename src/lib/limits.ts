/** Business rules, kept as pure functions so they are trivially testable. */
export const MAX_SHELVES_PER_PAGE = 5;
export const FREE_PAGE_LIMIT = 1;
export const MAX_PAGES_PER_USER = 25;

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
