"use client";

import { useSyncExternalStore } from "react";

/**
 * On-screen keyboard tracking via the VisualViewport API (iOS Safari never shrinks the layout viewport,
 * so `position: fixed; bottom: 0` ends up behind the keyboard). One shared rAF-throttled listener feeds
 * every subscriber; components re-render only when the rounded inset actually changes.
 */
const OPEN_THRESHOLD = 80; // px; ignores Safari's URL-bar collapse and rounding noise

let inset = 0;
let frame = 0;
const subs = new Set<() => void>();

function read() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const next = read();
    if (next === inset) return;
    inset = next;
    document.documentElement.toggleAttribute("data-keyboard-open", next > OPEN_THRESHOLD);
    subs.forEach((cb) => cb());
  });
}

function subscribe(cb: () => void) {
  const vv = window.visualViewport;
  subs.add(cb);
  if (subs.size === 1 && vv) {
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("focusin", schedule);
    window.addEventListener("focusout", schedule);
    schedule();
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && vv) {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("focusout", schedule);
    }
  };
}

const getInset = () => inset;
const getServer = () => 0;

/** Pixels the on-screen keyboard covers at the bottom of the layout viewport (0 when closed or on desktop). */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getInset, getServer);
}

/** Inset plus an `open` flag. Dock bars with `transform: translateY(-inset)` (compositor-only, no layout). */
export function useKeyboard(): { inset: number; open: boolean } {
  const value = useKeyboardInset();
  return { inset: value, open: value > OPEN_THRESHOLD };
}

const getOpen = () => inset > OPEN_THRESHOLD;
const getServerOpen = () => false;

/** Just whether the keyboard is up; re-renders only when that flips (cheap enough for global chrome). */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, getOpen, getServerOpen);
}
