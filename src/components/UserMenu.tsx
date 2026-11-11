"use client";

import clsx from "clsx";
import { Gem, House, LayoutGrid, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Avatar } from "./ui/Avatar";
import { useToast } from "./ui/Toast";

/** Account menu. `sidebar` = bottom row of the left sidebar; `tab` = avatar tab in the phone bottom bar. */
export function UserMenu({
  username,
  displayName,
  avatarUrl,
  plus,
  variant = "sidebar",
  active = false,
}: {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  plus: boolean;
  variant?: "sidebar" | "tab";
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST", json: {} });
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn't log out. Try again.");
    }
  }

  const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-surface-2";
  const close = () => setOpen(false);
  return (
    <div className={clsx("relative", variant === "tab" ? "flex flex-1 justify-center" : "w-full")} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={clsx(
          variant === "sidebar"
            ? "flex h-14 w-full items-center justify-center gap-3 rounded-xl transition hover:bg-surface-2 lg:justify-start lg:px-3"
            : "grid size-11 place-items-center rounded-full",
        )}
      >
        <Avatar name={displayName} username={username} avatarUrl={avatarUrl} size={variant === "sidebar" ? 34 : 28} className={clsx(variant === "tab" && active && "ring-2 ring-ink ring-offset-2 ring-offset-surface")} />
        {variant === "sidebar" && (
          <span className="hidden min-w-0 text-left leading-tight lg:block">
            <span className="flex items-center gap-1.5">
              <span className="max-w-28 truncate text-sm font-semibold">{displayName}</span>
              {plus && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-ink">Plus</span>}
            </span>
            <span className="block max-w-36 truncate text-xs text-muted">@{username}</span>
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl",
            variant === "sidebar" ? "bottom-full left-0 mb-2" : "bottom-full right-0 mb-3",
          )}
        >
          <div className="px-3 py-2 text-xs text-muted">@{username}</div>
          <Link role="menuitem" href="/" className={item} onClick={close}><House className="size-4" aria-hidden /> Home feed</Link>
          <Link role="menuitem" href={`/u/${username}`} className={item} onClick={close}><LayoutGrid className="size-4" aria-hidden /> My shelves</Link>
          <Link role="menuitem" href="/pricing" className={item} onClick={close}><Gem className="size-4" aria-hidden /> {plus ? "Manage plan" : "Upgrade to Plus"}</Link>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" className={item} onClick={logout}><LogOut className="size-4" aria-hidden /> Log out</button>
        </div>
      )}
    </div>
  );
}
