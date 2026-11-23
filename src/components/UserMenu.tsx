"use client";

import clsx from "clsx";
import { Gem, History, House, LayoutGrid, LogOut, Menu as MenuIcon, NotebookPen, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Avatar } from "./ui/Avatar";
import { PlusSeal } from "./ui/PlusSeal";
import { useToast } from "./ui/Toast";

/** Account menu. `sidebar` = bottom row of the left sidebar; `tab` = avatar tab in the phone bottom bar; `icon` = menu button in the phone top bar on your own profile. */
export function UserMenu({
  username,
  displayName,
  avatarUrl,
  plus,
  variant = "sidebar",
  active = false,
  expanded = false,
}: {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  plus: boolean;
  variant?: "sidebar" | "tab" | "icon";
  active?: boolean;
  expanded?: boolean;
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

  const item = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-meta transition-colors hover:bg-surface-hover";
  const close = () => setOpen(false);
  return (
    <div className={clsx("relative", variant === "tab" ? "flex flex-1 justify-center" : variant === "icon" ? "" : "w-full")} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={clsx(
          variant === "sidebar"
            ? "nav-row nav-row-account hover:bg-surface-hover"
            : "grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-hover",
        )}
      >
        {variant === "icon" ? (
          <MenuIcon className="size-6" aria-hidden strokeWidth={1.8} />
        ) : (
        <span className={clsx(variant === "sidebar" && "nav-icon-slot")}>
          <Avatar
            name={displayName}
            username={username}
            avatarUrl={avatarUrl}
            size={variant === "sidebar" ? 32 : 28}
            className={clsx(variant === "tab" && active && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
          />
        </span>
        )}
        {variant === "sidebar" && (
          <span className="nav-label min-w-0 pr-3 text-left leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="max-w-28 truncate text-meta font-semibold">{displayName}</span>
              {plus && <PlusSeal size="sm" interactive={false} />}
            </span>
            <span className="block max-w-36 truncate text-caption text-muted">@{username}</span>
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute z-overlay w-60 rounded-2xl border border-border bg-surface-raised p-1.5 shadow-lg",
            variant === "sidebar" ? (expanded ? "bottom-full left-0 mb-2" : "bottom-0 left-full ml-2") : variant === "icon" ? "right-0 top-full mt-1" : "bottom-full right-0 mb-3",
          )}
        >
          <div className="px-3 py-2 text-caption text-muted">@{username}</div>
          {variant !== "icon" && <Link role="menuitem" href="/" className={item} onClick={close}><House className="size-4" aria-hidden /> Home feed</Link>}
          {variant !== "icon" && <Link role="menuitem" href={`/u/${username}`} className={item} onClick={close}><LayoutGrid className="size-4" aria-hidden /> My collections</Link>}
          <Link role="menuitem" href="/timeline" className={item} onClick={close}><History className="size-4" aria-hidden /> Timeline</Link>
          <Link role="menuitem" href="/blog?view=mine" className={item} onClick={close}><NotebookPen className="size-4" aria-hidden /> Your posts</Link>
          <Link role="menuitem" href="/pricing" className={item} onClick={close}><Gem className="size-4" aria-hidden /> {plus ? "Manage plan" : "Upgrade to Plus"}</Link>
          <Link role="menuitem" href="/settings" className={item} onClick={close}><Settings className="size-4" aria-hidden /> Settings</Link>
          <div className="my-1 border-t border-border" />
          <button role="menuitem" className={item} onClick={logout}><LogOut className="size-4" aria-hidden /> Log out</button>
        </div>
      )}
    </div>
  );
}
