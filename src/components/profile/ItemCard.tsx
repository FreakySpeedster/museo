"use client";

import clsx from "clsx";
import type { ItemDTO } from "@/lib/dto";
import { Tilt } from "@/components/motion/Tilt";
import { ItemThumb } from "./ItemThumb";

export function ItemCard({ item, onOpen, dragging, grab }: { item: ItemDTO; onOpen: (item: ItemDTO) => void; dragging?: boolean; grab?: boolean }) {
  return (
    <Tilt
      className={clsx(
        "group relative rounded-2xl border border-line bg-surface shadow-card transition-opacity",
        grab && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <button onClick={() => onOpen(item)} className="block w-full overflow-hidden rounded-2xl text-left" aria-label={`Open ${item.title}`}>
        <div className="aspect-[4/5] w-full overflow-hidden">
          <div className="h-full w-full transition duration-500 group-hover:scale-105">
            <ItemThumb item={item} />
          </div>
        </div>
        <div className="space-y-0.5 p-3">
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h4>
          <p className="flex items-center gap-1 text-xs text-muted">
            {item.type === "LINK" ? (
              <>
                <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                <span className="truncate">{item.siteName ?? "Link"}</span>
              </>
            ) : (
              <>
                <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
                Photo
              </>
            )}
          </p>
        </div>
      </button>
    </Tilt>
  );
}
