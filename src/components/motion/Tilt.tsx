"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { canHover, gsap, reducedMotion } from "@/lib/gsap";

/** 3D hover tilt with a moving glare. Disabled for touch devices and reduced-motion users. */
export function Tilt({
  children,
  max = 8,
  glare = true,
  ...rest
}: { children: ReactNode; max?: number; glare?: boolean } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !canHover()) return;
    gsap.set(el, { transformPerspective: 800, transformOrigin: "center" });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.4, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.4, ease: "power3.out" });
    const lift = gsap.quickTo(el, "scale", { duration: 0.4, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * max * 2);
      rx(-py * max * 2);
      lift(1.03);
      if (glareRef.current) {
        gsap.to(glareRef.current, { opacity: 1, x: px * 60, y: py * 60, duration: 0.3 });
      }
    };
    const leave = () => {
      rx(0);
      ry(0);
      lift(1);
      if (glareRef.current) gsap.to(glareRef.current, { opacity: 0, duration: 0.4 });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "all" }); el.style.willChange = "transform";
    };
  }, [max]);

  return (
    <div ref={ref} {...rest} style={{ ...rest.style, willChange: "transform" }}>
      {children}
      {glare && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <div
            ref={glareRef}
            className="absolute -inset-1/2 opacity-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.22), transparent 45%)" }}
          />
        </div>
      )}
    </div>
  );
}
