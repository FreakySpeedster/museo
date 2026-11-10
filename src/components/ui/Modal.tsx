"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap, reducedMotion } from "@/lib/gsap";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([type="hidden"]),select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dismissible?: boolean;
}) {
  // `visible` keeps the dialog mounted while its exit animation plays.
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);

  if (open && !visible) setVisible(true); // adjust state during render (React-approved pattern)

  useEffect(() => {
    openRef.current = open;
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      return;
    }
    if (!visible) return;
    const done = () => {
      if (openRef.current) return;
      setVisible(false);
      lastFocus.current?.focus?.();
    };
    if (reducedMotion() || !panel.current) {
      const t = setTimeout(done, 0);
      return () => clearTimeout(t);
    }
    gsap.to(backdrop.current, { opacity: 0, duration: 0.2 });
    gsap.to(panel.current, { y: 24, opacity: 0, scale: 0.97, duration: 0.2, ease: "power2.in", onComplete: done });
  }, [open, visible]);

  useEffect(() => {
    if (!visible || !open) return;
    document.body.style.overflow = "hidden";
    if (!reducedMotion() && panel.current) {
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(panel.current, { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.4)" });
    }
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 60);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [visible, open]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [dismissible, onClose],
  );

  if (!visible) return null;

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={onKey} role="presentation">
      <div ref={backdrop} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => dismissible && onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {dismissible && (
            <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-ink">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
