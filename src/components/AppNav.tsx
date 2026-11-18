"use client";

import clsx from "clsx";
import { Bell, Gem, House, LayoutGrid, LogIn, NotebookPen, Pin, PinOff, Search, SquarePlus, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, reducedMotion } from "@/lib/gsap";
import { LogoMark, Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useSearch } from "./search/SearchProvider";
import { Avatar } from "./ui/Avatar";
import { CreateSheet } from "./create/CreateSheet";
import { GlassTabBar } from "./GlassTabBar";
import { CountBadge } from "./ui/CountBadge";
import { useUnreadCount } from "./notifications/useUnreadCount";

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
  count?: number;
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
export function AppNav({ user, unread = 0 }: { user: NavUser | null; unread?: number }) {
  const path = usePathname() ?? "/";
  const search = useSearch();
  const side = useRef<HTMLElement>(null);
  const enterTimer = useRef<number>(0);
  const leaveTimer = useRef<number>(0);
  const pinned = useSyncExternalStore(subscribePinned, getPinned, () => false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [creating, setCreating] = useState(false);
  const mine = user ? `/u/${user.username}` : "";
  const open = pinned || hover || focus;
  const liveUnread = useUnreadCount(unread);
  const unreadCount = path.startsWith("/notifications") ? 0 : liveUnread;

  useEffect(() => () => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
  }, []);

  const primary: Item[] = [
    { href: "/", label: "Home", icon: House, active: path === "/" },
    ...(user ? [{ href: mine, label: "Profile", icon: LayoutGrid, active: path.toLowerCase().startsWith(mine.toLowerCase()) }] : []),
    { href: "/blog", label: "Blog", icon: NotebookPen, active: path.startsWith("/blog") },
    ...(user ? [{ href: "/notifications", label: "Notifications", icon: Bell, active: path.startsWith("/notifications"), count: unreadCount }] : []),
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
      aria-label={it.count ? `${it.label}, ${it.count} unread` : undefined}
      className={clsx(
        "nav-row",
        it.primary ? "bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-pressed" : it.active ? "bg-surface-hover font-semibold text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <span className="nav-icon-slot">
        <span className="relative inline-flex">
          <it.icon className="nav-icon" aria-hidden strokeWidth={it.active ? 2.2 : 1.8} />
          <CountBadge count={it.count ?? 0} />
        </span>
      </span>
      <span className="nav-label whitespace-nowrap pr-3 text-meta">{it.label}</span>
    </Link>
  );

  // Phones: Home · Search · Create · Blog · Profile. Notifications live in the top bar; the account menu on your own profile.
  const tabs: Item[] = user
    ? primary.filter((it) => it.href === "/" || it.href === "/blog")
    : [primary[0], ...utility, ...guest];
  const onOwnProfile = Boolean(user) && path.toLowerCase().startsWith(mine.toLowerCase());

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
        <div className="mb-3 flex h-12 items-center px-[var(--nav-inset)]" data-nav-item>
          <Link href="/" aria-label="nook home" className="flex min-w-0 items-center rounded-lg">
            <span className="nav-icon-slot">
              <LogoMark className="size-7" />
            </span>
            <Wordmark className="nav-label whitespace-nowrap pr-3 text-heading" />
          </Link>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {primary.slice(0, 1).map(row)}
          <button
            type="button"
            data-nav-item
            title="Search"
            onClick={search.open}
            className="nav-row text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <span className="nav-icon-slot">
              <Search className="nav-icon" aria-hidden strokeWidth={path.startsWith("/search") ? 2.2 : 1.8} />
            </span>
            <span className="nav-label whitespace-nowrap pr-3 text-meta">Search</span>
          </button>
          {primary.slice(1).map(row)}
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
            className="nav-row text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <span className="nav-icon-slot">
              {pinned ? <PinOff className="nav-icon" aria-hidden strokeWidth={1.8} /> : <Pin className="nav-icon" aria-hidden strokeWidth={1.8} />}
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

      <header className="app-phone-top glass sticky top-0 z-nav border-b border-border/70 pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-12 items-center justify-between pl-4 pr-1.5">
          <Link href="/" aria-label="nook home" className="flex items-center gap-2 font-semibold tracking-tight">
            <LogoMark className="size-7" />
            <Wordmark className="text-heading" />
          </Link>
          <div className="flex items-center">
            {user ? (
              <>
                <Link
                  href="/notifications"
                  aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                  aria-current={path.startsWith("/notifications") ? "page" : undefined}
                  data-testid="topbar-notifications"
                  className="grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-hover"
                >
                  <span className="relative inline-flex">
                    <Bell className="size-6" aria-hidden strokeWidth={path.startsWith("/notifications") ? 2.4 : 1.8} fill={path.startsWith("/notifications") ? "currentColor" : "none"} />
                    <CountBadge count={unreadCount} />
                  </span>
                </Link>
                {onOwnProfile && <UserMenu username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} plus={user.subscribed} variant="icon" />}
              </>
            ) : (
              <ThemeToggle />
            )}
          </div>
        </div>
      </header>

      {user ? (
        <GlassTabBar
          tabs={[
            { key: "home", label: "Home", href: "/", active: path === "/", icon: (on) => <House className="size-6" aria-hidden strokeWidth={on ? 2.2 : 1.75} fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} /> },
            { key: "search", label: "Search", onClick: search.open, active: path.startsWith("/search"), icon: (on) => <Search className="size-6" aria-hidden strokeWidth={on ? 2.4 : 1.75} /> },
            { key: "create", label: "Create", onClick: () => setCreating(true), active: creating, testId: "tab-create", icon: (on) => <SquarePlus className="size-6" aria-hidden strokeWidth={on ? 2.2 : 1.75} /> },
            { key: "blog", label: "Blog", href: "/blog", active: path.startsWith("/blog"), icon: (on) => <NotebookPen className="size-6" aria-hidden strokeWidth={on ? 2.2 : 1.75} /> },
            {
              key: "profile",
              label: "Profile",
              href: mine,
              active: onOwnProfile,
              testId: "tab-profile",
              icon: (on) => <Avatar name={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size={26} className={clsx("transition-shadow", on && "ring-2 ring-foreground ring-offset-2 ring-offset-transparent")} />,
            },
          ]}
        />
      ) : (
        <GlassTabBar tabs={tabs.map((it) => ({ key: it.href, label: it.label, href: it.href, active: it.active, icon: (on: boolean) => <it.icon className="size-6" aria-hidden strokeWidth={on ? 2.2 : 1.75} /> }))} />
      )}
      {user && <CreateSheet open={creating} onClose={() => setCreating(false)} username={user.username} subscribed={user.subscribed} />}
    </>
  );
}
