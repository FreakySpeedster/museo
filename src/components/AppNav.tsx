"use client";

import clsx from "clsx";
import { Gem, House, LayoutGrid, LogIn, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, reducedMotion } from "@/lib/gsap";
import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export interface NavUser {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  subscribed: boolean;
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  primary?: boolean;
}

function Brand({ wordmark }: { wordmark: boolean }) {
  return (
    <Link href="/" aria-label="Shelfie home" className="flex items-center gap-3 rounded-xl px-1 py-1.5 font-semibold tracking-tight">
      <LogoMark className="size-9 shrink-0" />
      {wordmark && <span className="hidden text-xl lg:inline">Shelfie</span>}
    </Link>
  );
}

/**
 * Instagram-style navigation: left sidebar (icon rail at md, labelled at lg) on desktop;
 * slim top bar + bottom tab bar on phones.
 */
export function AppNav({ user }: { user: NavUser | null }) {
  const path = usePathname() ?? "/";
  const side = useRef<HTMLElement>(null);
  const mine = user ? `/u/${user.username}` : "";

  const items: Item[] = [
    { href: "/", label: "Home", icon: House, active: path === "/" },
    ...(user ? [{ href: mine, label: "My shelves", icon: LayoutGrid, active: path.toLowerCase().startsWith(mine.toLowerCase()) }] : []),
    { href: "/pricing", label: "Pricing", icon: Gem, active: path.startsWith("/pricing") },
  ];
  const guest: Item[] = [
    { href: "/login", label: "Log in", icon: LogIn, active: path.startsWith("/login") },
    { href: "/signup", label: "Sign up", icon: UserPlus, active: path.startsWith("/signup"), primary: true },
  ];

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from("[data-nav-item]", { x: -14, opacity: 0, stagger: 0.05, duration: 0.5, ease: "power3.out", clearProps: "all" });
    },
    { scope: side },
  );

  const row = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      data-nav-item
      aria-current={it.active ? "page" : undefined}
      title={it.label}
      className={clsx(
        "flex h-12 items-center justify-center gap-4 rounded-xl transition lg:justify-start lg:px-3",
        it.primary ? "bg-accent text-accent-ink hover:brightness-110" : it.active ? "bg-surface-2 font-semibold text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <it.icon className="size-6 shrink-0" aria-hidden strokeWidth={it.active ? 2.3 : 1.8} />
      <span className="hidden text-[15px] lg:inline">{it.label}</span>
    </Link>
  );

  const tabs: Item[] = user ? items : [...items.filter((i) => i.href !== "/pricing"), items.find((i) => i.href === "/pricing")!, ...guest];

  return (
    <>
      {/* ------------------------------------------------ desktop sidebar */}
      <aside
        ref={side}
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-line bg-[color-mix(in_srgb,var(--bg)_92%,var(--surface))] px-3 pb-4 pt-5 md:flex lg:w-60"
      >
        <div className="mb-6 flex justify-center lg:justify-start lg:px-2" data-nav-item>
          <Brand wordmark />
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {items.map(row)}
          {!user && <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">{guest.map(row)}</div>}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <ThemeToggle variant="row" />
          {user && (
            <div className="mt-1 border-t border-line pt-2">
              <UserMenu username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} plus={user.subscribed} variant="sidebar" />
            </div>
          )}
        </div>
      </aside>

      {/* ------------------------------------------------ phone top bar */}
      <header className="glass sticky top-0 z-40 flex h-12 items-center justify-between border-b border-line/70 px-4 md:hidden">
        <Link href="/" aria-label="Shelfie home" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="size-7" />
          <span className="text-lg">Shelfie</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* ------------------------------------------------ phone bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-line bg-[color-mix(in_srgb,var(--bg)_92%,var(--surface))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {tabs.map((it) => (
          <Link
            key={`tab-${it.href}`}
            href={it.href}
            aria-current={it.active ? "page" : undefined}
            className={clsx("flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium", it.active ? "text-ink" : "text-muted", it.primary && "text-accent")}
          >
            <it.icon className="size-6" aria-hidden strokeWidth={it.active ? 2.3 : 1.8} />
            <span>{it.label}</span>
          </Link>
        ))}
        {user && (
          <UserMenu username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} plus={user.subscribed} variant="tab" active={path.toLowerCase().startsWith(mine.toLowerCase())} />
        )}
      </nav>
    </>
  );
}
