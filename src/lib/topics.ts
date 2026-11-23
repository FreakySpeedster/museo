import { CATEGORY_IDS } from "./categories";

/** A topic page exists for every built-in category except "other" (custom categories are personal). */
export const isTopicSlug = (slug: string) => CATEGORY_IDS.includes(slug) && slug !== "other";
