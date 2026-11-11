"use client";

import clsx from "clsx";
import { useState } from "react";
import type { ItemDTO } from "@/lib/dto";

const PALETTES = [
  ["#ff5a2c", "#ffb020"], ["#7c3aed", "#ec4899"], ["#0ea5e9", "#22c55e"], ["#f43f5e", "#f59e0b"],
  ["#14b8a6", "#6366f1"], ["#84cc16", "#06b6d4"], ["#d946ef", "#3b82f6"], ["#ef4444", "#f97316"],
];

export function gradientFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

type ThumbItem = Pick<ItemDTO, "imageUrl" | "faviconUrl" | "title" | "siteName" | "type" | "id">;

/** Thumbnail with graceful fallbacks: image -> favicon on gradient -> initial on gradient. */
export function ItemThumb({ item, className, eager }: { item: ThumbItem; className?: string; eager?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [favFailed, setFavFailed] = useState(false);
  const showImg = item.imageUrl && !imgFailed;
  return (
    <div className={clsx("relative h-full w-full overflow-hidden bg-surface-hover", className)}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl!}
          alt={item.title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={() => setImgFailed(true)}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-white" style={{ background: gradientFor(item.id + item.title) }}>
          {item.faviconUrl && !favFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.faviconUrl} alt="" draggable={false} onError={() => setFavFailed(true)} className="size-14 rounded-2xl bg-white/90 object-contain p-2 shadow-lg" />
          ) : (
            <span className="text-title font-semibold drop-shadow">{item.title.charAt(0).toUpperCase()}</span>
          )}
          {item.siteName && <span className="line-clamp-1 text-caption font-medium opacity-90">{item.siteName}</span>}
        </div>
      )}
    </div>
  );
}
