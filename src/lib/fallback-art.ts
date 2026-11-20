/**
 * Fallback artwork system: when an item has no photo, or its photo fails to load or was removed, we show a flat
 * vector illustration for its category on a soft two-tone gradient. The motif comes from the collection's
 * category (or a keyword match on loose names like "Perfumes" or "Next trips"); the palette is picked from a
 * stable hash of the item id, so the same item always looks the same while neighbours vary.
 */
import { CATEGORY_GROUPS, customLabel, isCustomCategory } from "./categories";

export const MOTIFS = [
  "bottle", "plant", "flower", "book", "sneaker", "shirt", "watch", "ring", "bag", "glasses", "vinyl", "headphones",
  "film", "gamepad", "dice", "cards", "robot", "blocks", "coin", "camera", "palette", "frame", "pencil", "phone",
  "laptop", "keyboard", "guitar", "sofa", "bowl", "cup", "wine", "beer", "cake", "pizza", "trophy", "dumbbell",
  "bike", "mountain", "tent", "pagoda", "pin", "city", "plane", "boat", "fish", "car", "ticket", "heart", "paw",
  "planet", "columns", "hammer", "generic",
] as const;
export type Motif = (typeof MOTIFS)[number];

/** Every category id the app offers, mapped to its illustration. */
export const CATEGORY_MOTIF: Record<string, Motif> = {
  fashion: "shirt", sneakers: "sneaker", watches: "watch", fragrance: "bottle", jewelry: "ring", bags: "bag",
  eyewear: "glasses", headwear: "shirt", beauty: "bottle",
  books: "book", comics: "book", music: "headphones", vinyl: "vinyl", "film-tv": "film", anime: "film",
  podcasts: "headphones", reading: "book", posters: "frame",
  games: "gamepad", "board-games": "dice", puzzles: "dice", tcg: "cards",
  toys: "robot", "action-figures": "robot", lego: "blocks", models: "car", coins: "coin", stamps: "frame",
  antiques: "columns", memorabilia: "trophy", crafts: "palette",
  tech: "phone", phones: "phone", computers: "laptop", keyboards: "keyboard", audio: "headphones", displays: "laptop",
  code: "laptop", science: "planet",
  art: "palette", photography: "camera", drawing: "pencil", stationery: "pencil", instruments: "guitar",
  home: "sofa", furniture: "sofa", kitchen: "bowl", plants: "plant", tools: "hammer", pets: "paw", flowers: "flower",
  food: "bowl", coffee: "cup", wine: "wine", spirits: "wine", beer: "beer", snacks: "cake", "street-food": "pizza",
  sports: "trophy", fitness: "dumbbell", cycling: "bike", hiking: "tent", climbing: "mountain", "water-sports": "boat",
  fishing: "fish",
  travel: "pagoda", destinations: "pin", cities: "city", maps: "pin", flights: "plane", culture: "columns",
  cars: "car", motorcycles: "car", boats: "boat",
  courses: "book", manuscripts: "book", events: "ticket", wellness: "heart", nature: "mountain", storage: "generic",
  other: "generic",
};

/** Extra words people use for collection names that the category keywords don't cover. */
const SYNONYMS: Partial<Record<Motif, string>> = {
  bottle: "perfume perfumes fragrances parfum cologne scents skincare serum makeup lipstick",
  plant: "plant houseplant monstera succulent cactus garden jungle greenery bonsai",
  book: "book novel novels library reads tbr bookshelf manga literature poetry",
  sneaker: "sneaker sneakers shoe shoes kicks trainers jordans nike adidas",
  shirt: "clothing wardrobe outfit outfits tees tshirts jackets dresses style streetwear",
  pagoda: "trip trips vacation vacations holiday holidays travel journey getaway kyoto japan wanderlust",
  pin: "place places destination bucket wishlist spots",
  cup: "coffee tea cafe cafes espresso matcha",
  bowl: "food recipe recipes ramen dinner eats restaurant restaurants dishes cooking",
  film: "movie movies film films cinema series shows watchlist",
  gamepad: "game games gaming console playstation xbox nintendo switch steam",
  vinyl: "vinyl record records album albums lp",
  headphones: "music songs playlist playlists headphone headphones",
  car: "car cars auto supercar jdm",
  camera: "camera cameras lens lenses photo photos film-camera",
  watch: "watch watches rolex omega seiko",
};

const WORD_TO_MOTIF = (() => {
  const m = new Map<string, Motif>();
  const add = (words: string, motif: Motif) => {
    for (const w of words.toLowerCase().split(/[^a-z0-9]+/)) if (w.length > 2 && !m.has(w)) m.set(w, motif);
  };
  for (const [motif, words] of Object.entries(SYNONYMS)) add(words!, motif as Motif);
  const cats = CATEGORY_GROUPS.flatMap((g) => g.items).filter((c) => c.id !== "other");
  // Ids and labels outrank the looser search keywords ("sports" is a category, not just a kind of trading card).
  for (const c of cats) add(`${c.id} ${c.label}`, CATEGORY_MOTIF[c.id] ?? "generic");
  for (const c of cats) add(c.keywords ?? "", CATEGORY_MOTIF[c.id] ?? "generic");
  return m;
})();

function matchWords(text: string | null | undefined): Motif | null {
  if (!text) return null;
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    const hit = WORD_TO_MOTIF.get(raw) ?? WORD_TO_MOTIF.get(raw.replace(/(es|s)$/, "")) ?? WORD_TO_MOTIF.get(`${raw}s`);
    if (hit) return hit;
  }
  return null;
}

export interface ArtHintValue {
  category?: string | null;
  collection?: string | null;
}

/** Category id first, then keywords in the collection name, custom label, title and source; else generic. */
export function motifFor({ category, collection, title, source }: ArtHintValue & { title?: string | null; source?: string | null }): Motif {
  if (category && category !== "other" && CATEGORY_MOTIF[category]) return CATEGORY_MOTIF[category];
  return (
    matchWords(collection) ??
    (category && isCustomCategory(category) ? matchWords(customLabel(category)) : null) ??
    matchWords(title) ??
    matchWords(source) ??
    "generic"
  );
}

export interface ArtPalette {
  /** Gradient start (top-left) and end (bottom-right). */
  from: string;
  to: string;
  /** Main object colour, a deeper shade of it, and a contrasting detail colour. */
  fg: string;
  deep: string;
  accent: string;
}

/** Soft two-tone gradients with a deep object colour and a warm or cool accent. Vivid enough for both themes. */
export const ART_PALETTES: ArtPalette[] = [
  { from: "#b7ebb0", to: "#4fae80", fg: "#1f6b4a", deep: "#134a33", accent: "#f6c453" }, // sage
  { from: "#e2f58c", to: "#38c3a5", fg: "#13695a", deep: "#0b4a3f", accent: "#ff8a5b" }, // lime teal
  { from: "#8de3d8", to: "#3f7ef0", fg: "#1d3f8f", deep: "#132b66", accent: "#fde68a" }, // teal blue
  { from: "#fde9a0", to: "#f2a516", fg: "#9a3f12", deep: "#6e2c0b", accent: "#fff3db" }, // amber
  { from: "#fec08a", to: "#f2546f", fg: "#7f1d2d", deep: "#5a1220", accent: "#ffe8b0" }, // coral
  { from: "#a8cffd", to: "#14b38a", fg: "#0b5446", deep: "#073a31", accent: "#fff08a" }, // blue green
  { from: "#d6c9ff", to: "#8b5cf6", fg: "#3d1a78", deep: "#2a1057", accent: "#ffc7e3" }, // lavender
  { from: "#ffd3dc", to: "#e9558f", fg: "#7d1846", deep: "#590f31", accent: "#fff1a8" }, // rose
  { from: "#c5e9fd", to: "#6670f0", fg: "#2c2a7a", deep: "#1d1b57", accent: "#fcd34d" }, // sky indigo
  { from: "#fde7c8", to: "#d9774f", fg: "#5b2a1a", deep: "#3f1c10", accent: "#bfe3d0" }, // sand terracotta
  { from: "#b3f5d6", to: "#0e7490", fg: "#083a4a", deep: "#052833", accent: "#fde047" }, // mint ink
  { from: "#b4c0d0", to: "#3a4a63", fg: "#141c2b", deep: "#0b111c", accent: "#fbbf24" }, // slate night
];

/** FNV-1a; stable across server and client. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

export const paletteFor = (seed: string): ArtPalette => ART_PALETTES[hashSeed(seed) % ART_PALETTES.length];
