"use client";

import clsx from "clsx";
import { Image as ImageIcon, Link2 } from "lucide-react";
import type { ItemDTO } from "@/lib/dto";
import { Tilt } from "@/components/motion/Tilt";
import { ItemThumb } from "./ItemThumb";

export function ItemCard({ item, onOpen, dragging, grab }: { item: ItemDTO; onOpen: (item: ItemDTO) => void; dragging?: boolean; grab?: boolean }) {
  return (
    <Tilt
      className={clsx(
        "group relative rounded-2xl border border-border bg-surface shadow-md transition-opacity",
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
          <h4 className="line-clamp-2 text-meta font-semibold leading-snug">{item.title}</h4>
          <p className="flex items-center gap-1 text-caption text-muted">
            {item.type === "LINK" ? (
              <>
                <Link2 className="size-4 shrink-0" aria-hidden strokeWidth={2.2} />
                <span className="truncate">{item.siteName ?? "Link"}</span>
              </>
            ) : (
              <>
                <ImageIcon className="size-4 shrink-0" aria-hidden strokeWidth={2.2} />
                Photo
              </>
            )}
          </p>
        </div>
      </button>
    </Tilt>
  );
}
