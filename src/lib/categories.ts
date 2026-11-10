export const CATEGORIES = [
  { id: "books", label: "Books", emoji: "📖" },
  { id: "music", label: "Music", emoji: "🎧" },
  { id: "film-tv", label: "Film & TV", emoji: "🎬" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "art", label: "Art & Design", emoji: "🎨" },
  { id: "photography", label: "Photography", emoji: "📷" },
  { id: "fashion", label: "Fashion & Sneakers", emoji: "👟" },
  { id: "food", label: "Food & Drink", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "🧭" },
  { id: "tech", label: "Tech & Gadgets", emoji: "💾" },
  { id: "plants", label: "Plants & Garden", emoji: "🪴" },
  { id: "home", label: "Home & Decor", emoji: "🛋️" },
  { id: "toys", label: "Toys & Figures", emoji: "🧸" },
  { id: "code", label: "Code & Projects", emoji: "🧪" },
  { id: "reading", label: "Articles & Reads", emoji: "📰" },
  { id: "other", label: "Other", emoji: "✨" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
