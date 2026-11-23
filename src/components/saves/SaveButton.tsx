"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/client";
import { loginHref } from "@/lib/safe-next";
import { useToast } from "@/components/ui/Toast";

/**
 * Save to the private Want list. A star (the bookmark already means "Add to my collection" here).
 * Optimistic with rollback; 44px tap target; aria-pressed for screen readers.
 * - "icon": a post's action row.  - "overlay": a frosted disc on a photo tile.
 */
export function SaveButton({
  itemId,
  savedByMe,
  signedIn,
  onChange,
  variant = "icon",
  className,
  iconClassName,
}: {
  itemId: string;
  savedByMe?: boolean;
  signedIn: boolean;
  onChange?: (saved: boolean) => void;
  variant?: "icon" | "overlay";
  className?: string;
  iconClassName?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(Boolean(savedByMe));
  const [pending, setPending] = useState(false);
  const [pop, setPop] = useState(0);
  // Follow the prop only when it actually changes (parents may or may not patch it back).
  const [seen, setSeen] = useState(savedByMe);
  if (seen !== savedByMe && !pending) {
    setSeen(savedByMe);
    setSaved(Boolean(savedByMe));
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      toast.info("Sign in to save things you want.");
      router.push(loginHref(`${pathname}${window.location.search}`));
      return;
    }
    if (pending) return;
    const next = !saved;
    setPending(true);
    setSaved(next);
    if (next) setPop((n) => n + 1);
    onChange?.(next);
    try {
      const res = await api<{ savedByMe: boolean }>(`/api/items/${itemId}/save`, { method: next ? "PUT" : "DELETE" });
      setSaved(res.savedByMe);
      onChange?.(res.savedByMe);
      if (res.savedByMe) toast.success("Saved to your Want list");
    } catch (err) {
      setSaved(!next);
      onChange?.(!next);
      toast.error(err instanceof ApiError ? err.message : "Couldn't update your Want list");
    } finally {
      setPending(false);
    }
  }

  const label = saved ? "Remove from your Want list" : "Save to your Want list";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      data-hit="compact"
      data-testid="save-button"
      data-saved={saved || undefined}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-[transform,background-color,color] duration-[var(--duration-fast)] active:scale-90",
        variant === "icon" && "text-foreground hover:bg-surface-hover",
        variant === "overlay" && "group/save",
        className,
      )}
    >
      {variant === "overlay" ? (
        <span className={clsx("grid size-8 place-items-center rounded-full shadow-sm backdrop-blur-md transition-colors", saved ? "bg-white text-black" : "bg-black/45 text-white group-hover/save:bg-black/60")}>
          <Star key={pop} className={clsx("size-4", pop > 0 && saved && "like-pop")} fill={saved ? "currentColor" : "none"} strokeWidth={2} aria-hidden />
        </span>
      ) : (
        <Star key={pop} className={clsx(iconClassName ?? "size-6", pop > 0 && saved && "like-pop")} fill={saved ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
