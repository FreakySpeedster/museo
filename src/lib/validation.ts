import { z } from "zod";
import { isValidCategory } from "./categories";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((v) => v ?? "");

export const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "login", "logout", "signup", "settings", "pricing", "billing",
  "u", "i", "about", "help", "support", "explore", "feed", "search", "uploads", "shelfie", "nook", "static", "_next",
]);

export const usernameSchema = z
  .string({ error: "Username is required" })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3–20 characters: letters, numbers or underscores")
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved");

export const signupSchema = z.object({
  email: z.string({ error: "Email is required" }).trim().toLowerCase().max(254).pipe(z.email("Enter a valid email")),
  username: usernameSchema,
  displayName: trimmed(1, 50, "Display name").optional(),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export const visibilitySchema = z.enum(["public", "private"]);

export const profileSchema = z.object({
  displayName: trimmed(1, 50, "Display name"),
  bio: optionalText(240, "Bio"),
  socialLinks: z.array(z.object({ network: z.string().trim().min(1).max(40), url: z.string().trim().max(500) })).max(8).optional(),
});

/** Account settings; every field optional so each control can save on its own. */
export const settingsSchema = z.object({
  followPolicy: z.enum(["request", "open"]).optional(),
});

export const pageSchema = z.object({
  title: trimmed(1, 60, "Page title"),
  description: optionalText(240, "Description"),
  visibility: visibilitySchema.optional(),
});
export const pageUpdateSchema = pageSchema.partial();

export const shelfSchema = z.object({
  name: trimmed(1, 40, "Shelf name"),
  category: z.string().trim().refine(isValidCategory, { error: "Choose a category" }),
  visibility: visibilitySchema.optional(),
});
export const shelfUpdateSchema = z.object({
  name: trimmed(1, 40, "Shelf name").optional(),
  visibility: visibilitySchema.optional(),
  // A shelf holds items of one category; category is fixed once set to keep that promise.
});

/** Tags: lowercase words, deduped, max 8 of 24 chars. Accepts an array, a JSON array string or a comma-separated string. */
export const tagsSchema = z
  .preprocess((v) => {
    if (typeof v === "string") {
      try { const j = JSON.parse(v); if (Array.isArray(j)) return j; } catch { /* comma list */ }
      return v.split(",");
    }
    return v ?? [];
  }, z.array(z.string()))
  .transform((arr) => [...new Set(arr.map((t) => t.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 24)).filter(Boolean))].slice(0, 8));

export const itemTextSchema = z.object({
  tags: tagsSchema.optional(),
  title: z.string().trim().max(120, "Title must be at most 120 characters").optional().transform((v) => v ?? ""),
  description: optionalText(500, "Description"),
});

export const itemCreateLinkSchema = itemTextSchema.extend({
  url: z.string({ error: "Link is required" }).trim().min(1, "Link is required").max(2048),
});

export const itemUpdateSchema = z.object({
  title: trimmed(1, 120, "Title").optional(),
  description: optionalText(500, "Description").optional(),
  tags: tagsSchema.optional(),
  visibility: visibilitySchema.optional(),
});

export const reorderSchema = z.object({
  itemIds: z.array(z.string().min(1).max(40)).min(1).max(500),
});

export const reorderShelvesSchema = z.object({
  shelfIds: z.array(z.string().min(1).max(40)).min(1).max(50),
});

export const reorderPagesSchema = z.object({
  pageIds: z.array(z.string().min(1).max(40)).min(1).max(50),
});

export const previewQuerySchema = z.object({
  url: z.string().trim().min(1, "Link is required").max(2048),
});

export const feedQuerySchema = z.object({
  scope: z.enum(["global", "following"]).default("global"),
  cursor: z.string().max(60).optional(),
});

export const commentSchema = z.object({
  body: trimmed(1, 500, "Comment"),
  parentId: z.string().min(1).max(40).optional(),
});

/** The reaction palette; kept small so counts stay meaningful. */
export const REACTION_EMOJIS = ["\u2764\uFE0F", "\u{1F602}", "\u{1F525}", "\u{1F44F}", "\u{1F62E}", "\u{1F44D}"] as const;
export const reactionSchema = z.object({ emoji: z.enum(REACTION_EMOJIS) });

export const searchQuerySchema = z.object({
  q: z.string().trim().max(80),
  type: z.enum(["all", "people", "items", "shelves"]).default("all"),
  sort: z.enum(["relevance", "new", "top"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  cursor: z.string().max(80).optional(),
});

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}

export const shelfMoveSchema = z.object({ pageId: z.string().min(1).max(64) });
