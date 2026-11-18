"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

/**
 * Floating liquid-glass tab bar for phones (H&M / iOS style): a frosted pill inset from the edges,
 * icon-only tabs, and a softer glass capsule that slides to the active tab.
 */
export function GlassTabBar({ tabs }: { tabs: GlassTab[] }) {
  const bar = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const activeKey = tabs.find((t) => t.active)?.key ?? null;

  const measure = useCallback(() => {
    const el = activeKey ? refs.current[activeKey] : null;
    const host = bar.current;
    if (!el || !host) return setPill(null);
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    setPill({ x: a.left - b.left, w: a.width });
  }, [activeKey]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <nav aria-label="Primary" data-testid="tab-bar" className="app-phone-nav pointer-events-none fixed inset-x-0 bottom-0 z-nav px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
      <div ref={bar} className="glass-bar pointer-events-auto relative mx-auto flex h-[3.75rem] max-w-md items-stretch rounded-full p-1.5">
        <span
          aria-hidden
          data-testid="tab-indicator"
          className={clsx("glass-capsule absolute inset-y-1.5 left-0 rounded-full", pill ? "opacity-100" : "opacity-0")}
          style={pill ? { width: pill.w, transform: `translateX(${pill.x}px)` } : undefined}
        />
        {tabs.map((t) => {
          const inner = (
            <span className="relative inline-flex">
              {t.icon(t.active)}
              <CountBadge count={t.count ?? 0} />
            </span>
          );
          const cls = clsx(
            "relative z-10 grid min-h-11 min-w-11 flex-1 place-items-center rounded-full transition-[color,transform] duration-150 active:scale-90",
            t.active ? "text-foreground" : "text-foreground/60 hover:text-foreground",
          );
          const aria = t.count ? `${t.label}, ${t.count} new` : t.label;
          return t.href ? (
            <Link key={t.key} ref={(el) => { refs.current[t.key] = el; }} href={t.href} aria-label={aria} aria-current={t.active ? "page" : undefined} className={cls} data-testid={t.testId}>
              {inner}
            </Link>
          ) : (
            <button key={t.key} ref={(el) => { refs.current[t.key] = el; }} type="button" onClick={t.onClick} aria-label={aria} aria-pressed={t.active} className={cls} data-testid={t.testId}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
