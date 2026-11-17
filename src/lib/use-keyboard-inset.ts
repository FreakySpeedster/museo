"use client";

import { useEffect, useState } from "react";

/**
 * Pixels the on-screen keyboard covers at the bottom of the layout viewport (0 when closed or on desktop).
 * Lets docked bars (comment composer, editor toolbar) ride on top of the keyboard on iOS and Android.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}
