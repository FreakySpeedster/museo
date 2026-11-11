"use client";

import clsx from "clsx";
import { Gem, House, LayoutGrid, LogIn, Pin, PinOff, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const PIN_KEY = "shelfie.nav-pinned";
const OPEN_DELAY = 100;
const CLOSE_DELAY = 200;

function subscribePinned(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nav-pinned"] });
  return () => obs.disconnect();
}
const getPinned = () => document.documentElement.hasAttribute("data-nav-pinned");

function writePinned(next: boolean) {
  try {
    localStorage.setItem(PIN_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  document.documentElement.toggleAttribute("data-nav-pinned", next);
}

/**
 * Desktop: icon-only rail that expands on hover/focus as an overlay.
 * Pinning keeps it open and shifts the page. Phones: slim top bar + bottom tabs.
 * Groups are structured so Search, Notifications or Create can slot in later
 * without rearranging the chrome — only items that exist are rendered.
 */
export function AppNav({ user }: { user: NavUser | null }) {
  const path = usePathname() ?? "/";
  const side = useRef<HTMLElement>(null);
  const enterTimer = useRef<number>(0);
  const leaveTimer = useRef<number>(0);
  const pinned = useSyncExternalStore(subscribePinned, getPinned, () => false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const mine = user ? `/u/${user.username}` : "";
  const open = pinned || hover || focus;

  useEffect(() => () => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
  }, []);

  const primary: Item[] = [
    { href: "/", label: "Home", icon: House, active: path === "/" },
    ...(user ? [{ href: mine, label: "My shelves", icon: LayoutGrid, active: path.toLowerCase().startsWith(mine.toLowerCase()) }] : []),
    // Future: Search, Notifications, Create — add here when those features ship.
  ];
  const utility: Item[] = [
    { href: "/pricing", label: "Pricing", icon: Gem, active: path.startsWith("/pricing") },
  ];
  const guest: Item[] = [
    { href: "/login", label: "Log in", icon: LogIn, active: path.startsWith("/login") },
    { href: "/signup", label: "Sign up", icon: UserPlus, active: path.startsWith("/signup"), primary: true },
  ];

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from("[data-nav-item]", { opacity: 0, stagger: 0.04, duration: 0.3, ease: "power2.out", clearProps: "all" });
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
        "flex h-12 items-center rounded-xl transition-colors",
        it.primary ? "bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-pressed" : it.active ? "bg-surface-hover font-semibold text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <span className="grid w-[4.5rem] shrink-0 place-items-center">
        <it.icon className="size-6" aria-hidden strokeWidth={it.active ? 2.3 : 1.8} />
      </span>
      <span className="nav-label whitespace-nowrap pr-3 text-meta">{it.label}</span>
    </Link>
  );

  const tabs: Item[] = user ? [...primary, ...utility] : [...primary, ...utility, ...guest];

  function onEnter() {
    window.clearTimeout(leaveTimer.current);
    enterTimer.current = window.setTimeout(() => setHover(true), OPEN_DELAY);
  }
  function onLeave() {
    window.clearTimeout(enterTimer.current);
    leaveTimer.current = window.setTimeout(() => setHover(false), CLOSE_DELAY);
  }
  function togglePin() {
    writePinned(!pinned);
  }

  return (
    <>
      <aside
        ref={side}
        aria-label="Main"
        data-open={open ? "true" : "false"}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocusCapture={() => setFocus(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(false);
        }}
        className="app-nav-side fixed inset-y-0 left-0 z-nav hidden flex-col overflow-hidden border-r border-border bg-[color-mix(in_srgb,var(--background)_94%,var(--surface))] pb-3 pt-4 md:flex"
      >
        <div className="mb-4 flex h-12 items-center" data-nav-item>
          <Link href="/" aria-label="Shelfie home" className="flex min-w-0 items-center rounded-xl">
            <span className="grid w-[4.5rem] shrink-0 place-items-center">
              <LogoMark className="size-8" />
            </span>
            <span className="nav-label whitespace-nowrap pr-3 text-heading font-semibold tracking-tight">Shelfie</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {primary.map(row)}
        </nav>
        <nav className="mt-3 flex flex-col gap-1 border-t border-border pt-3" aria-label="More">
          {utility.map(row)}
          {!user && guest.map(row)}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <ThemeToggle variant="row" />
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? "Collapse sidebar" : "Keep sidebar open"}
            title={pinned ? "Collapse sidebar" : "Keep sidebar open"}
            className="flex h-12 w-full items-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <span className="grid w-[4.5rem] shrink-0 place-items-center">
              {pinned ? <PinOff className="size-5" aria-hidden strokeWidth={1.8} /> : <Pin className="size-5" aria-hidden strokeWidth={1.8} />}
            </span>
            <span className="nav-label whitespace-nowrap pr-3 text-meta">{pinned ? "Collapse" : "Keep open"}</span>
          </button>
          {user && (
            <div className="mt-1 border-t border-border pt-2">
              <UserMenu
                username={user.username}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                plus={user.subscribed}
                variant="sidebar"
                expanded={open}
              />
            </div>
          )}
        </div>
      </aside>

      <header className="glass sticky top-0 z-nav flex h-12 items-center justify-between border-b border-border/70 px-4 md:hidden">
        <Link href="/" aria-label="Shelfie home" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="size-7" />
          <span className="text-heading">Shelfie</span>
        </Link>
        <ThemeToggle />
      </header>

      <nav
        aria-label="Primary"
        className="app-phone-nav fixed inset-x-0 bottom-0 z-nav flex items-center border-t border-border bg-[color-mix(in_srgb,var(--background)_92%,var(--surface))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {tabs.map((it) => (
          <Link
            key={`tab-${it.href}`}
            href={it.href}
            aria-current={it.active ? "page" : undefined}
            className={clsx(
              "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-micro font-medium",
              it.active ? "text-foreground" : "text-muted",
              it.primary && !it.active && "text-accent",
            )}
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
