"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

/** Visual size as a fraction of the name font. Header is slightly larger so it reads at ~20px on text-body. */
const DOT_EM = { sm: "1.2em", md: "1.2em", lg: "1.2em", header: "1.25em" } as const;
export type PlusMarkSize = keyof typeof DOT_EM;

/** Fallback font size when the mark is not inheriting from a name. */
const FONT: Record<PlusMarkSize, string> = {
  sm: "text-meta",
  md: "text-meta",
  lg: "text-body",
  header: "text-body sm:text-heading",
};

/** 12% of the 32-unit diameter. */
const TICK_STROKE = 3.84;
/** Check path is nudged slightly left and down so it looks optically centred. */
const TICK = "M8.2 17.4 13.2 22.2 22.4 10.2";

export function PlusMark({
  size = "md",
  interactive = true,
  inheritFont = false,
  className,
}: {
  size?: PlusMarkSize;
  /** False when the mark sits inside a button or link, so we don't nest interactive elements. */
  interactive?: boolean;
  /** Use the surrounding name's font size for `em` units, instead of the size fallback. */
  inheritFont?: boolean;
  className?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const tipId = `pmt-${raw}`;
  const em = DOT_EM[size];
  const [open, setOpen] = useState(false);
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
  }
  function onKey(e: ReactKeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  // Padding grows the hit area to 24px; matching negative margin keeps the layout box at the badge size.
  const inset = interactive ? `max(0px, calc((24px - ${em}) / 2))` : "0px";
  const box: CSSProperties = {
    width: em,
    height: em,
    boxSizing: "content-box",
    padding: inset,
    margin: interactive ? `calc(-1 * ${inset})` : 0,
  };

  const badge = (
    <svg viewBox="0 0 32 32" aria-hidden className="block size-full">
      <circle cx="16" cy="16" r="16" className="fill-plus" />
      <path
        d={TICK}
        fill="none"
        stroke="white"
        strokeWidth={TICK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const shared = {
    ref: wrap as never,
    "data-testid": "plus-mark",
    "aria-label": "Museo Plus member" as const,
    className: clsx(
      "relative inline-grid shrink-0 place-items-center bg-transparent",
      !inheritFont && FONT[size],
      interactive && "cursor-pointer rounded-full outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      className,
    ),
    style: box,
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
      {badge}
    </button>
  ) : (
    <span {...shared} role="img">
      {badge}
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
