"use client";

import clsx from "clsx";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CollectSheet, type Collected } from "./CollectSheet";

/**
 * Bookmark-plus in a post's action row: copy someone else's item into one of your collections.
 * Turns into a filled check-bookmark once you keep it (tap again to add it to another collection).
 */
export function CollectButton({
  itemId,
  ownerId,
  viewerId,
  collected,
  onChange,
  variant = "icon",
  className,
}: {
  itemId: string;
  ownerId: string;
  viewerId?: string | null;
  collected?: Collected;
  onChange?: (c: Collected) => void;
  variant?: "icon" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Collected>(collected ?? []);
  const toast = useToast();
  const router = useRouter();
  if (viewerId && ownerId === viewerId) return null;
  const has = local.length > 0;
  const label = has ? `In your collection: ${local.map((c) => c.shelfName).join(", ")}` : "Add to my collection";

  function click() {
    if (!viewerId) {
      toast.info("Sign in to start your own collection.");
      router.push("/login");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={click}
          aria-label={label}
          title={label}
          data-hit="compact"
          data-testid="collect-button"
          data-collected={has || undefined}
          className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-transform active:scale-90 hover:bg-surface-hover", className)}
        >
          {has ? <BookmarkCheck className="size-6" fill="currentColor" stroke="var(--background)" strokeWidth={1.5} aria-hidden /> : <BookmarkPlus className="size-6" strokeWidth={1.75} aria-hidden />}
        </button>
      ) : (
        <button
          type="button"
          onClick={click}
          data-testid="collect-button"
          data-collected={has || undefined}
          className={clsx(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-meta font-semibold transition-transform active:scale-[0.97]",
            has ? "border border-border bg-surface text-foreground" : "bg-accent text-accent-contrast",
            className,
          )}
        >
          {has ? <BookmarkCheck className="size-5" aria-hidden /> : <BookmarkPlus className="size-5" aria-hidden />}
          {has ? "In your collection" : "Add to my collection"}
        </button>
      )}
      <CollectSheet
        itemId={itemId}
        open={open}
        onClose={() => setOpen(false)}
        onCollected={(c) => {
          setLocal(c);
          onChange?.(c);
        }}
      />
    </>
  );
}
