"use client";

import { useRef, type ReactNode } from "react";
import { gsap, reducedMotion, useGSAP } from "@/lib/gsap";

/** Re-mounts on every navigation, giving each route a soft slide/fade entrance. */
export default function Template({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from(ref.current, { opacity: 0, y: 8, duration: 0.22, ease: "power2.out", clearProps: "all" });
    },
    { scope: ref },
  );
  return <div ref={ref}>{children}</div>;
}
