"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

const SIZES = { sm: 14, md: 16, lg: 18, header: 22 } as const;
export type PlusSealSize = keyof typeof SIZES;

/** 8-lobe scalloped seal, drawn at 32×32 and scaled down so it stays crisp at 14–22px. */
const SEAL =
  "M16 3.65Q21.55 2.6 24.73 7.27Q29.4 10.45 28.35 16Q29.4 21.55 24.73 24.73Q21.55 29.4 16 28.35Q10.45 29.4 7.27 24.73Q2.6 21.55 3.65 16Q2.6 10.45 7.27 7.27Q10.45 2.6 16 3.65Z";

export function PlusSeal({
  size = "md",
  interactive = true,
  className,
}: {
  size?: PlusSealSize;
  /** False when the seal sits inside a button or link, so we don't nest interactive elements. */
  interactive?: boolean;
  className?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const gid = `psg-${raw}`;
  const tipId = `pst-${raw}`;
  const px = SIZES[size];
  const [open, setOpen] = useState(false);
  const [shine, setShine] = useState(true);
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

  function retriggerShine() {
    setShine(false);
    requestAnimationFrame(() => setShine(true));
  }

  useEffect(() => {
    const t = window.setTimeout(() => setShine(false), 900);
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
    retriggerShine();
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
    retriggerShine();
  }
  function onKey(e: ReactKeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  const svg = (
    <svg viewBox="0 0 32 32" width={px} height={px} aria-hidden className="block">
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--gold-bright)" />
          <stop offset="45%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--gold-deep)" />
        </linearGradient>
        <linearGradient id={`${gid}-rim`} x1="8" y1="5" x2="24" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--gold-deep)" />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <path d={SEAL} />
        </clipPath>
      </defs>
      <path d={SEAL} fill={`url(#${gid})`} />
      <path d={SEAL} fill="none" stroke={`url(#${gid}-rim)`} strokeWidth="1.2" />
      <circle cx="16" cy="16" r="8.4" fill="var(--gold-deep)" opacity="0.2" />
      <circle cx="16" cy="16" r="8.4" fill="none" stroke="var(--gold-deep)" strokeWidth="0.7" opacity="0.5" />
      {/* Engraved museum arch */}
      <path
        d="M11.05 20.6V13.15C11.05 10.45 13.15 8.55 16 8.55S20.95 10.45 20.95 13.15V20.6h-2.45v-6.35c0-1.45-1.1-2.45-2.5-2.45s-2.5 1-2.5 2.45v6.35Z"
        fill="var(--gold-subtle)"
        stroke="var(--gold-deep)"
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      {shine && (
        <rect
          className="plus-seal-shine"
          x="-10"
          y="0"
          width="16"
          height="32"
          fill="var(--gold-bright)"
          opacity="0.55"
          clipPath={`url(#${gid}-clip)`}
        />
      )}
    </svg>
  );

  const shared = {
    ref: wrap as never,
    "data-testid": "plus-seal",
    "aria-label": "Museo Plus member" as const,
    className: clsx(
      "relative inline-grid shrink-0 place-items-center rounded-full align-middle text-gold after:absolute after:-inset-1.5",
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
