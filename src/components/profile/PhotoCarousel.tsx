"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useState, type MouseEvent } from "react";
import type { ItemDTO } from "@/lib/dto";
import { ItemImage } from "@/components/art/ItemImage";
import type { ArtHintValue } from "@/lib/fallback-art";
import { ItemThumb } from "./ItemThumb";

type CarouselItem = Pick<ItemDTO, "imageUrl" | "faviconUrl" | "title" | "siteName" | "type" | "id"> & { images?: string[] };

export function galleryOf(item: CarouselItem): string[] {
  return item.imageUrl ? [item.imageUrl, ...(item.images ?? []).filter((u) => u !== item.imageUrl)] : [];
}

/** The gallery minus photos that failed to load or were removed upstream; `fail` drops one. */
export function useGallery(item: CarouselItem) {
  const [failed, setFailed] = useState<string[]>([]);
  const fail = useCallback((src: string) => setFailed((f) => (f.includes(src) ? f : [...f, src])), []);
  return { photos: galleryOf(item).filter((u) => !failed.includes(u)), fail };
}

/**
 * Instagram-style swipeable photos: native scroll-snap for touch swipes, arrows on hover for mouse users,
 * and dots marking the active photo. Falls back to the single-thumbnail renderer for one photo or none.
 */
export function PhotoCarousel({ item, eager, className, fit = "cover", hint }: { item: CarouselItem; eager?: boolean; className?: string; fit?: "cover" | "contain"; hint?: ArtHintValue }) {
  const { photos, fail } = useGallery(item);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (photos.length <= 1) return <ItemThumb item={item} src={photos[0] ?? null} onFail={fail} hint={hint} eager={eager} className={className} />;

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  function go(e: MouseEvent, dir: -1 | 1) {
    e.stopPropagation();
    e.preventDefault();
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, index + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100 max-md:hidden";

  return (
    <div className={clsx("group/carousel relative h-full w-full overflow-hidden bg-surface-hover", className)} data-testid="photo-carousel">
      <div
        ref={track}
        onScroll={onScroll}
        // Keep swipes from starting a drag-to-reorder on the card.
        onPointerDown={(e) => e.pointerType === "touch" && e.stopPropagation()}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        style={{ scrollbarWidth: "none" }}
      >
        {photos.map((src, i) => (
          <ItemImage
            key={src}
            src={src}
            alt={i === 0 ? item.title : `${item.title}, photo ${i + 1}`}
            art={{ seed: item.id, caption: item.siteName, ...hint }}
            onFail={fail}
            loading={eager && i === 0 ? "eager" : "lazy"}
            className={clsx("h-full w-full shrink-0 snap-center snap-always", fit === "contain" ? "object-contain" : "object-cover")}
          />
        ))}
      </div>
      {index > 0 && (
        <button type="button" aria-label="Previous photo" onClick={(e) => go(e, -1)} className={clsx(arrow, "left-2")}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      )}
      {index < photos.length - 1 && (
        <button type="button" aria-label="Next photo" onClick={(e) => go(e, 1)} className={clsx(arrow, "right-2")}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1" aria-label={`Photo ${index + 1} of ${photos.length}`} role="status">
        {photos.map((src, i) => (
          <span key={src} className={clsx("size-1.5 rounded-full shadow transition-all", i === index ? "bg-white" : "bg-white/50")} />
        ))}
      </div>
    </div>
  );
}
