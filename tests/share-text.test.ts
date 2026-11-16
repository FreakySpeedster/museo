import { describe, expect, it } from "vitest";
import { shelfShareText } from "@/lib/share-text";

describe("shelfShareText", () => {
  it("numbers items and appends the profile link", () => {
    expect(shelfShareText(["MPS Tygar perfume", " Kouros "], "https://nook.app/", "aarav")).toBe(
      "1. MPS Tygar perfume\n2. Kouros\n\nShared from nook. Check out my nook profile -> https://nook.app/u/aarav",
    );
  });
});
