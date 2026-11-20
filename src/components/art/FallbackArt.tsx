"use client";

import clsx from "clsx";
import { createContext, memo, useContext, useMemo, type ReactNode } from "react";
import { motifFor, paletteFor, type ArtHintValue, type Motif } from "@/lib/fallback-art";
import { MOTIF_ART } from "./motifs";

const ArtHintContext = createContext<ArtHintValue>({});

/** Tells every fallback below which collection it sits in, so the art matches (e.g. a shelf grid, a feed post). */
export function ArtHint({ category, collection, children }: ArtHintValue & { children: ReactNode }) {
  const value = useMemo(() => ({ category, collection }), [category, collection]);
  return <ArtHintContext.Provider value={value}>{children}</ArtHintContext.Provider>;
}

export interface ArtSpec extends ArtHintValue {
  /** Stable id (usually the item id) that picks the palette. */
  seed: string;
  /** Accessible name and keyword source. */
  title: string;
  /** Small caption at the bottom on larger tiles (e.g. the source site). */
  caption?: string | null;
  /** Force a motif (previews, tests). */
  motif?: Motif;
}

/**
 * Category illustration on a two-tone gradient (sized by `className`, full size by default). Fills its box at any aspect ratio: the background stretches,
 * the illustration stays square and centred, and the caption only appears when the tile is wide enough.
 */
export const FallbackArt = memo(function FallbackArt({ seed, title, caption, category, collection, motif, className }: ArtSpec & { className?: string }) {
  const hint = useContext(ArtHintContext);
  const cat = category ?? hint.category;
  const col = collection ?? hint.collection;
  const m = motif ?? motifFor({ category: cat, collection: col, title, source: caption });
  const p = paletteFor(seed);
  return (
    <div
      role="img"
      aria-label={title}
      data-fallback-art={m}
      className={clsx("@container relative overflow-hidden", className ?? "h-full w-full")}
      style={{ backgroundImage: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)` }}
    >
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <circle cx="88" cy="10" r="34" fill="#fff" opacity=".14" />
        <circle cx="6" cy="96" r="22" fill="#000" opacity=".06" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        className={clsx("absolute left-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2", caption ? "top-1/2 @min-[7rem]:top-[45%]" : "top-1/2")}
      >
        {MOTIF_ART[m](p)}
      </svg>
      {caption && (
        <span className="absolute inset-x-2 bottom-[5%] hidden truncate text-center text-caption font-semibold text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.25)] @min-[7rem]:block">
          {caption}
        </span>
      )}
    </div>
  );
});
