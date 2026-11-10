import { gsap, reducedMotion } from "@/lib/gsap";

/** A small burst of colourful dots from an element's centre — used for add-item / upgrade celebrations. */
export function burst(from: HTMLElement | null, count = 18) {
  if (!from || reducedMotion()) return;
  const r = from.getBoundingClientRect();
  const colors = ["#ff5a2c", "#ffb020", "#22c55e", "#0ea5e9", "#a855f7", "#ec4899"];
  const layer = document.createElement("div");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden";
  document.body.appendChild(layer);
  const dots = Array.from({ length: count }, (_, i) => {
    const d = document.createElement("span");
    const size = 6 + Math.random() * 6;
    d.style.cssText = `position:absolute;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${size}px;height:${size}px;border-radius:${i % 3 === 0 ? "2px" : "50%"};background:${colors[i % colors.length]}`;
    layer.appendChild(d);
    return d;
  });
  const tl = gsap.timeline({ onComplete: () => layer.remove() });
  dots.forEach((d) => {
    const x = gsap.utils.random(-150, 150);
    const up = gsap.utils.random(-190, -60);
    tl.to(d, { x, rotation: gsap.utils.random(-360, 360), duration: 1.2, ease: "power2.out" }, 0)
      .to(d, { y: up, duration: 0.45, ease: "power2.out" }, 0)
      .to(d, { y: up + 220, opacity: 0, duration: 0.75, ease: "power2.in" }, 0.45);
  });
}
