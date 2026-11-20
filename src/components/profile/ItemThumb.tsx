"use client";

import clsx from "clsx";
import type { ItemDTO } from "@/lib/dto";
import { ItemImage } from "@/components/art/ItemImage";
import type { ArtHintValue } from "@/lib/fallback-art";

type ThumbItem = Pick<ItemDTO, "imageUrl" | "title" | "siteName" | "id"> & Partial<Pick<ItemDTO, "faviconUrl" | "type">>;

/**
 * Cover-cropped item photo; with no photo, or one that fails or was removed, the category artwork.
 * `src` overrides the cover (e.g. the first gallery photo that still loads); `hint` overrides the ArtHint context.
 */
export function ItemThumb({ item, className, eager, src, hint, onFail }: { item: ThumbItem; className?: string; eager?: boolean; src?: string | null; hint?: ArtHintValue; onFail?: (src: string) => void }) {
  return (
    <div className={clsx("relative h-full w-full overflow-hidden bg-surface-hover", className)}>
      <ItemImage
        src={src === undefined ? item.imageUrl : src}
        alt={item.title}
        art={{ seed: item.id, caption: item.siteName, ...hint }}
        loading={eager ? "eager" : "lazy"}
        onFail={onFail}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
