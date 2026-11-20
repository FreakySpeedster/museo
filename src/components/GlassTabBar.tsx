"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useKeyboardOpen } from "@/lib/use-keyboard-inset";
import { CountBadge } from "./ui/CountBadge";

export interface GlassTab {
  key: string;
  label: string;
  /** Rendered icon (24px). Receives whether the tab is active. */
  icon: (active: boolean) => ReactNode;
  active: boolean;
  href?: string;
  onClick?: () => void;
  count?: number;
  testId?: string;
}

/** How long an optimistic highlight may wait for the route to change before we assume navigation was cancelled. */
const PENDING_TIMEOUT = 4000;

/**
 * Floating liquid-glass tab bar for phones (H&M / iOS style): a frosted pill inset from the edges,
 * icon-only tabs, and a softer glass capsule that slides to the active tab.
 *
 * Feels instant like Instagram/X: the capsule and icon switch on pointerdown (optimistic), then reconcile
 * with the real pathname. Tapping the tab you're on scrolls back to the top. All tab routes are prefetched.
 */
export function GlassTabBar({ tabs }: { tabs: GlassTab[] }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const keyboardOpen = useKeyboardOpen();
  const bar = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const timer = useRef(0);
  const [slots, setSlots] = useState<Record<string, { x: number; w: number }>>({});
  // Optimistic target, valid only while the pathname is still the one it was tapped on.
  const [pending, setPending] = useState<{ key: string; from: string } | null>(null);
  const optimistic = pending && pending.from === path ? pending.key : null;
  const activeKey = optimistic ?? tabs.find((t) => t.active)?.key ?? null;
  const pill = activeKey ? slots[activeKey] : undefined;
  const hrefs = tabs.map((t) => t.href).filter(Boolean).join("|");

  const measure = useCallback(() => {
    const host = bar.current;
    if (!host) return;
    const b = host.getBoundingClientRect();
    const next: Record<string, { x: number; w: number }> = {};
    for (const [k, el] of Object.entries(refs.current)) {
      if (!el) continue;
      const a = el.getBoundingClientRect();
      next[k] = { x: a.left - b.left, w: a.width };
    }
    setSlots(next);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (bar.current) ro.observe(bar.current);
    return () => ro.disconnect();
  }, [measure, tabs.length]);

  // Warm every tab route so the tap only has to paint (loading.tsx skeletons cover server time).
  useEffect(() => {
    for (const href of hrefs.split("|")) if (href) router.prefetch(href);
  }, [hrefs, router]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function press(t: GlassTab, e: PointerEvent) {
    if (!t.href || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    setPending({ key: t.key, from: path });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPending(null), PENDING_TIMEOUT);
  }

  function click(t: GlassTab, e: MouseEvent) {
    if (t.href && t.href === path) {
      e.preventDefault();
      setPending(null);
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  return (
    <nav
      aria-label="Primary"
      data-testid="tab-bar"
      className={clsx("app-phone-nav pointer-events-none fixed inset-x-0 bottom-0 z-nav px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden", keyboardOpen && "hidden")}
    >
      <div ref={bar} className="glass-bar pointer-events-auto relative mx-auto flex h-[3.75rem] max-w-md items-stretch rounded-full p-1.5">
        <span
          aria-hidden
          data-testid="tab-indicator"
          className={clsx("glass-capsule absolute inset-y-1.5 left-0 rounded-full", pill ? "opacity-100" : "opacity-0")}
          style={pill ? { width: pill.w, transform: `translate3d(${pill.x}px,0,0)` } : undefined}
        />
        {tabs.map((t) => {
          const on = t.key === activeKey;
          const inner = (
            <span className="tab-press relative inline-flex">
              {t.icon(on)}
              <CountBadge count={t.count ?? 0} />
            </span>
          );
          const cls = clsx("tab-btn relative z-10 grid min-h-11 min-w-11 flex-1 place-items-center rounded-full", on ? "text-foreground" : "text-foreground/60 hover:text-foreground");
          const aria = t.count ? `${t.label}, ${t.count} new` : t.label;
          const setRef = (el: HTMLElement | null) => { refs.current[t.key] = el; };
          return t.href ? (
            <Link
              key={t.key}
              ref={setRef}
              href={t.href}
              aria-label={aria}
              aria-current={t.active ? "page" : undefined}
              className={cls}
              data-testid={t.testId}
              onPointerDown={(e) => press(t, e)}
              onPointerCancel={() => setPending(null)}
              onClick={(e) => click(t, e)}
            >
              {inner}
            </Link>
          ) : (
            <button key={t.key} ref={setRef} type="button" onClick={t.onClick} aria-label={aria} aria-pressed={t.active} className={cls} data-testid={t.testId}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
