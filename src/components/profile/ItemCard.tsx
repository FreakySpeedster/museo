"use client";

import clsx from "clsx";
import { Heart, MessageCircle } from "lucide-react";
import type { ItemDTO } from "@/lib/dto";
import { PhotoCarousel } from "./PhotoCarousel";
import { VisibilityLock } from "@/components/ui/VisibilityLock";
import { count } from "@/lib/plural";

export function ItemCard({ item, onOpen, dragging, grab }: { item: ItemDTO; onOpen: (item: ItemDTO) => void; dragging?: boolean; grab?: boolean }) {
  return (
    <div
      className={clsx(
        "group relative rounded-2xl border border-border bg-surface shadow-md transition-opacity",
        grab && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-t-2xl" onClick={() => onOpen(item)} aria-hidden>
        <div className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]">
          <PhotoCarousel item={item} />
        </div>
      </div>
      <button onClick={() => onOpen(item)} className="block w-full overflow-hidden rounded-b-2xl text-left" aria-label={`Open ${item.title}`}>
        <div className="space-y-0.5 p-3">
          <h4 className="flex items-start gap-1.5 text-meta font-semibold leading-snug">
            <span className="line-clamp-2">{item.title}</span>
            {item.visibility === "private" && <VisibilityLock label="Private item" />}
          </h4>
          <p className="flex items-center gap-3 text-caption text-muted empty:hidden">
            {item.likeCount > 0 && (
              <span className="inline-flex items-center gap-1" title={count(item.likeCount, "like")}>
                <Heart className="size-3.5" aria-hidden />{item.likeCount}
              </span>
            )}
            {item.commentCount > 0 && (
              <span className="inline-flex items-center gap-1" title={count(item.commentCount, "comment")}>
                <MessageCircle className="size-3.5" aria-hidden />{item.commentCount}
              </span>
            )}
          </p>
        </div>
      </button>
    </div>
  );
}
