"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

const SIZES = { sm: 14, md: 16, lg: 18, header: 22 } as const;
export type PlusMarkSize = keyof typeof SIZES;

/** 4-point sparkle, drawn at 32×32 so it stays crisp and bold at 14–22px. */
const SPARKLE =
  "M13.8 2.8C13.8 11.78,17.61 16.4,25 16.4C17.61 16.4,13.8 21.02,13.8 30C13.8 21.02,9.99 16.4,2.6 16.4C9.99 16.4,13.8 11.78,13.8 2.8Z";
const SPARKLE_TINY =
  "M25.6 2.6C25.6 5.48,26.97 7.1,29.4 7.1C26.97 7.1,25.6 8.72,25.6 11.6C25.6 8.72,24.23 7.1,21.8 7.1C24.23 7.1,25.6 5.48,25.6 2.6Z";

export function PlusMark({
  size = "md",
  interactive = true,
  className,
}: {
  size?: PlusMarkSize;
  /** False when the mark sits inside a button or link, so we don't nest interactive elements. */
  interactive?: boolean;
  className?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const tipId = `pmt-${raw}`;
  const px = SIZES[size];
  const [open, setOpen] = useState(false);
  const [twinkle, setTwinkle] = useState(true);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrap = useRef<HTMLButtonElement | HTMLSpanElement | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const hover = useRef<number>(0);

  function place() {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 200;
    const left = Math.min(window.innerWidth - width - 8, Math.max(8, r.left + r.width / 2 - width / 2));
    let top = r.bottom + 8;
    if (top + 76 > window.innerHeight - 8) top = Math.max(8, r.top - 76 - 8);
    setPos({ top, left });
  }

  function retriggerTwinkle() {
    setTwinkle(false);
    requestAnimationFrame(() => setTwinkle(true));
  }

  useEffect(() => {
    const t = window.setTimeout(() => setTwinkle(false), 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open || !interactive) return;
    place();
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || tip.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        wrap.current?.focus();
      }
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, interactive]);

  function show() {
    if (!interactive) return;
    window.clearTimeout(hover.current);
    setOpen(true);
    retriggerTwinkle();
  }
  function hide() {
    if (!interactive) return;
    window.clearTimeout(hover.current);
    hover.current = window.setTimeout(() => setOpen(false), 120);
  }
  function toggle() {
    if (!interactive) return;
    window.clearTimeout(hover.current);
    setOpen((o) => !o);
    retriggerTwinkle();
  }
  function onKey(e: ReactKeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  const svg = (
    <svg viewBox="0 0 32 32" width={px} height={px} aria-hidden className="block fill-current">
      <path d={SPARKLE} className={twinkle ? "plus-mark-twinkle" : undefined} />
      <path d={SPARKLE_TINY} className={twinkle ? "plus-mark-twinkle plus-mark-twinkle-tiny" : undefined} />
    </svg>
  );

  const shared = {
    ref: wrap as never,
    "data-testid": "plus-mark",
    "aria-label": "Museo Plus member" as const,
    className: clsx(
      "relative inline-grid shrink-0 place-items-center rounded-full align-middle text-accent after:absolute after:-inset-1.5",
      interactive && "cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      className,
    ),
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  };

  const mark = interactive ? (
    <button
      type="button"
      {...shared}
      aria-expanded={open}
      aria-controls={open ? tipId : undefined}
      aria-describedby={open ? tipId : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      onKeyDown={onKey}
    >
      {svg}
    </button>
  ) : (
    <span {...shared} role="img">
      {svg}
    </span>
  );

  return (
    <>
      {mark}
      {interactive && open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tip}
              id={tipId}
              role="tooltip"
              style={{ top: pos.top, left: pos.left, width: 200 }}
              className="fixed z-[var(--z-popover)] rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-lg"
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <p className="text-meta font-semibold text-foreground">Museo Plus</p>
              <p className="text-caption text-muted">Unlimited collections and a public blog.</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
