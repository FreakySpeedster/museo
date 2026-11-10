"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Avatar } from "./ui/Avatar";
import { useToast } from "./ui/Toast";

export function UserMenu({ username, displayName, avatarUrl, plus }: { username: string; displayName: string; avatarUrl?: string | null; plus: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
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

  const item = "block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2";
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition hover:bg-surface-2"
      >
        <Avatar name={displayName} username={username} avatarUrl={avatarUrl} size={30} />
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{displayName}</span>
        {plus && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Plus</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
          <div className="px-3 py-2 text-xs text-muted">@{username}</div>
          <Link role="menuitem" href="/" className={item} onClick={() => setOpen(false)}>Home feed</Link>
          <Link role="menuitem" href={`/u/${username}`} className={item} onClick={() => setOpen(false)}>My shelves</Link>
          <Link role="menuitem" href="/pricing" className={item} onClick={() => setOpen(false)}>{plus ? "Manage plan" : "Upgrade to Plus"}</Link>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" className={item} onClick={logout}>Log out</button>
        </div>
      )}
    </div>
  );
}
