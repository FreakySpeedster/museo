"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";
import type { ItemDTO } from "@/lib/dto";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { galleryOf } from "@/components/profile/PhotoCarousel";

/** Portrait 4:5 to landscape 1.91:1: photos show at their own shape, but the scroll never gets a giant or a sliver. */
export const MIN_RATIO = 4 / 5;
export const MAX_RATIO = 1.91;
export const clampRatio = (w?: number | null, h?: number | null) => (w && h ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h)) : null);

type MediaItem = Pick<ItemDTO, "id" | "title" | "imageUrl" | "images" | "faviconUrl" | "siteName" | "type" | "imageWidth" | "imageHeight">;

/**
 * Full-bleed post media. Space is reserved from the stored cover size (no layout shift); older rows without a
 * size measure the first photo once it loads. Multi-photo posts swipe with dots; double-tap fires `onDoubleTap`.
 */
export function PostMedia({ item, onDoubleTap, eager, className }: { item: MediaItem; onDoubleTap?: () => void; eager?: boolean; className?: string }) {
  const photos = galleryOf(item);
  const stored = clampRatio(item.imageWidth, item.imageHeight);
  const [measured, setMeasured] = useState<number | null>(null);
  const ratio = stored ?? measured ?? (photos.length ? 1 : MAX_RATIO);
  const [index, setIndex] = useState(0);
  const [burst, setBurst] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  function onPointerUp(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button,a")) return;
    if (e.timeStamp - lastTap.current < 320) {
      lastTap.current = 0;
      setBurst((b) => b + 1);
      onDoubleTap?.();
    } else lastTap.current = e.timeStamp;
  }

  function go(e: MouseEvent, dir: -1 | 1) {
    e.stopPropagation();
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, index + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  const arrow = "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover/media:opacity-100 focus-visible:opacity-100 max-md:hidden";

  return (
    <div
      className={clsx("group/media relative w-full touch-manipulation select-none overflow-hidden bg-surface-hover", className)}
      style={{ aspectRatio: String(ratio) }}
      onPointerUp={onPointerUp}
      onDoubleClick={(e) => e.preventDefault()}
      data-testid="post-media"
    >
      {photos.length === 0 ? (
        <ItemThumb item={item} />
      ) : (
        <div
          ref={track}
          onScroll={() => {
            const el = track.current;
            if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={i === 0 ? item.title : `${item.title}, photo ${i + 1}`}
              loading={eager && i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onLoad={i === 0 && !stored ? (e) => setMeasured(clampRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)) : undefined}
              className="h-full w-full shrink-0 snap-center snap-always object-cover"
            />
          ))}
        </div>
      )}
      {photos.length > 1 && (
        <>
          {index > 0 && <button type="button" aria-label="Previous photo" onClick={(e) => go(e, -1)} className={clsx(arrow, "left-3")}><ChevronLeft className="size-5" aria-hidden /></button>}
          {index < photos.length - 1 && <button type="button" aria-label="Next photo" onClick={(e) => go(e, 1)} className={clsx(arrow, "right-3")}><ChevronRight className="size-5" aria-hidden /></button>}
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-micro font-medium tabular-nums text-white backdrop-blur">{index + 1}/{photos.length}</span>
        </>
      )}
      {burst > 0 && (
        <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <Heart className="heart-pop size-24 text-white drop-shadow-[0_6px_18px_rgb(0_0_0/0.35)]" fill="currentColor" strokeWidth={0} />
        </span>
      )}
      {photos.length > 1 && <Dots count={photos.length} index={index} />}
    </div>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" role="status" aria-label={`Photo ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={clsx("size-1.5 rounded-full shadow-[0_0_2px_rgb(0_0_0/0.4)] transition-all duration-200", i === index ? "w-4 bg-white" : "bg-white/55")} />
      ))}
    </div>
  );
}
