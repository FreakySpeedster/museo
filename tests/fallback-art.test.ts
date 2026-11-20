import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@/lib/categories";
import { ART_PALETTES, CATEGORY_MOTIF, MOTIFS, motifFor, paletteFor } from "@/lib/fallback-art";

describe("fallback art", () => {
  it("maps every category to a real motif", () => {
    for (const id of CATEGORY_IDS) expect(MOTIFS).toContain(CATEGORY_MOTIF[id]);
  });

  it("matches loose collection names, custom labels and titles", () => {
    expect(motifFor({ category: "fragrance" })).toBe("bottle");
    expect(motifFor({ category: "other", collection: "Perfumes" })).toBe("bottle");
    expect(motifFor({ category: "custom:Next trips" })).toBe("pagoda");
    expect(motifFor({ collection: "Living room jungle", title: "Monstera" })).toBe("plant");
    expect(motifFor({ collection: "Sports" })).toBe("trophy");
    expect(motifFor({ title: "Qwerty zx" })).toBe("generic");
  });

  it("picks a stable palette per seed and spreads neighbours", () => {
    expect(paletteFor("item-1")).toBe(paletteFor("item-1"));
    const used = new Set(Array.from({ length: 60 }, (_, i) => paletteFor(`cm${i}x`)));
    expect(used.size).toBeGreaterThan(ART_PALETTES.length / 2);
  });
});
