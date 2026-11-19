"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";
import { useState } from "react";
import { ApiError, api } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { count as countLabel } from "@/lib/plural";

export function LikeButton({
  itemId,
  likeCount,
  likedByMe,
  onChange,
  signedIn,
  className,
  hideCount,
  iconClassName = "size-5",
}: {
  itemId: string;
  likeCount: number;
  likedByMe: boolean;
  signedIn: boolean;
  onChange?: (next: { likeCount: number; likedByMe: boolean }) => void;
  className?: string;
  /** Posts show the count on its own line ("12 likes"). */
  hideCount?: boolean;
  iconClassName?: string;
}) {
  const toast = useToast();
  const [count, setCount] = useState(likeCount);
  const [liked, setLiked] = useState(likedByMe);
  const [pending, setPending] = useState(false);
  if (count !== likeCount && !pending) setCount(likeCount);
  if (liked !== likedByMe && !pending) setLiked(likedByMe);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      toast.info("Sign in to like this.");
      return;
    }
    if (pending) return;
    const prev = { count, liked };
    const next = { likeCount: liked ? count - 1 : count + 1, likedByMe: !liked };
    setPending(true);
    setCount(next.likeCount);
    setLiked(next.likedByMe);
    onChange?.(next);
    try {
      const res = await api<{ likeCount: number; likedByMe: boolean }>(`/api/items/${itemId}/like`, { method: "POST" });
      setCount(res.likeCount);
      setLiked(res.likedByMe);
      onChange?.(res);
    } catch (err) {
      setCount(prev.count);
      setLiked(prev.liked);
      onChange?.({ likeCount: prev.count, likedByMe: prev.liked });
      toast.error(err instanceof ApiError ? err.message : "Couldn't like that");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={`${liked ? "Unlike" : "Like"}, ${countLabel(count, "like")}`}
      data-hit="compact"
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-caption transition-transform active:scale-90 transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover",
        liked ? "text-danger" : "text-muted hover:text-foreground",
        className,
      )}
    >
      <Heart key={liked ? "on" : "off"} className={clsx(iconClassName, liked && pending && "like-pop")} aria-hidden fill={liked ? "currentColor" : "none"} strokeWidth={1.75} />
      {count > 0 && !hideCount && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
