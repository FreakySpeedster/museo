import { describe, expect, it } from "vitest";
import { shelfShareText } from "@/lib/share-text";

describe("shelfShareText", () => {
  it("numbers items and appends the profile link", () => {
    expect(shelfShareText(["MPS Tygar perfume", " Kouros "], "https://museo.app/", "aarav")).toBe(
      "1. MPS Tygar perfume\n2. Kouros\n\nShared from Museo. Check out my Museo profile -> https://museo.app/u/aarav",
    );
  });
});
