import { createElement } from "react";
import { categoryMeta } from "@/lib/categories";

/** Lucide icon for a stored shelf category (known id, custom label or legacy value). */
export function CategoryIcon({ category, className = "size-4" }: { category: string; className?: string }) {
  return createElement(categoryMeta(category).icon, { className, "aria-hidden": true, strokeWidth: 1.9 });
}
