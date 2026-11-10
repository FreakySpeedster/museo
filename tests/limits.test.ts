import { describe, expect, it } from "vitest";
import { canAddShelf, MAX_PAGES_PER_USER, MAX_SHELVES_PER_PAGE, pageCreationGate } from "@/lib/limits";

describe("shelf limit", () => {
  it("allows up to 5 shelves per page", () => {
    expect(MAX_SHELVES_PER_PAGE).toBe(5);
    for (let n = 0; n < 5; n++) expect(canAddShelf(n)).toBe(true);
    expect(canAddShelf(5)).toBe(false);
    expect(canAddShelf(9)).toBe(false);
  });
});

describe("page paywall gate", () => {
  it("first page is free", () => {
    expect(pageCreationGate({ subscribed: false, pageCount: 0 })).toEqual({ allowed: true });
  });
  it("second page needs a subscription", () => {
    expect(pageCreationGate({ subscribed: false, pageCount: 1 })).toEqual({ allowed: false, reason: "PAYWALL" });
    expect(pageCreationGate({ subscribed: true, pageCount: 1 })).toEqual({ allowed: true });
  });
  it("caps even subscribers", () => {
    expect(pageCreationGate({ subscribed: true, pageCount: MAX_PAGES_PER_USER })).toEqual({ allowed: false, reason: "MAX_PAGES" });
  });
});
