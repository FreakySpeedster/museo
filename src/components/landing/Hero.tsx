"use client";

import { useRef } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import Link from "next/link";
import { canHover, ensureScrollTrigger, ensureSplitText, gsap, useGSAP } from "@/lib/gsap";

const PILL = ["05-kind-of-blue", "16-monstera", "36-spirited-away", "24-kyoto", "33-hades", "01-dune"];
const TILES: { src: string; cls: string; depth: number }[] = [
  { src: "08-in-rainbows", cls: "left-[3%] top-[14%] w-28 rotate-[-8deg]", depth: 1.4 },
  { src: "18-fiddle-leaf-fig", cls: "left-[11%] bottom-[10%] w-24 rotate-[6deg]", depth: 0.8 },
  { src: "35-blade-runner", cls: "right-[4%] top-[10%] w-32 rotate-[7deg]", depth: 1.2 },
  { src: "22-lisbon", cls: "right-[12%] bottom-[14%] w-24 rotate-[-5deg]", depth: 0.9 },
  { src: "32-celeste", cls: "right-[30%] top-[4%] w-16 rotate-[10deg]", depth: 0.5 },
  { src: "02-project-hail-mary", cls: "left-[30%] bottom-[4%] w-16 rotate-[-12deg]", depth: 0.6 },
];

/** Kinetic hero: masked word reveal, an inline image capsule that cycles, magnetic CTA, and parallax tiles (pointer + scroll). */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 1024px)" }, (ctx) => {
        const { motion, wide } = ctx.conditions as { motion: boolean; wide: boolean };
        if (!motion) return;
        const SplitText = ensureSplitText();
        const ScrollTrigger = ensureScrollTrigger();

        // 1. Headline: lines rise out of masks.
        const split = SplitText.create(el.querySelector("[data-hero-title]"), { type: "lines", mask: "lines", linesClass: "hero-line" });
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(split.lines, { yPercent: 110, duration: 1.3, stagger: 0.09 })
          .from("[data-pill]", { scale: 0, duration: 1, ease: "back.out(1.7)" }, 0.35)
          .from("[data-hero-fade]", { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.55)
          .from("[data-tile]", { scale: 0.6, autoAlpha: 0, duration: 1.1, stagger: 0.06, ease: "power3.out" }, 0.4);

        // 2. Capsule image cycles (opacity + scale only).
        const imgs = gsap.utils.toArray<HTMLElement>("[data-pill-img]");
        let i = 0;
        const cycle = gsap.delayedCall(1.6, function next() {
          const cur = imgs[i];
          i = (i + 1) % imgs.length;
          gsap.timeline()
            .set(imgs[i], { zIndex: 2, autoAlpha: 1, yPercent: 100 })
            .set(cur, { zIndex: 1 })
            .to(imgs[i], { yPercent: 0, duration: 0.8, ease: "expo.out" })
            .set(cur, { autoAlpha: 0 });
          cycle.restart(true);
        });

        // 3. Scroll: tiles drift by depth, headline eases up a touch.
        const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]");
        tiles.forEach((t) => {
          gsap.to(t, { yPercent: -60 * Number(t.dataset.depth), ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
        });

        // 4. Pointer parallax with quickTo (one rAF-batched setter per tile, no re-renders).
        let off: (() => void) | undefined;
        if (wide && canHover()) {
          const setters = tiles.map((t) => ({ d: Number(t.dataset.depth), x: gsap.quickTo(t, "x", { duration: 0.9, ease: "power3" }), y: gsap.quickTo(t, "y", { duration: 0.9, ease: "power3" }) }));
          const btn = el.querySelector<HTMLElement>("[data-magnetic]");
          const bx = btn ? gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" }) : null;
          const by = btn ? gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" }) : null;
          const move = (e: PointerEvent) => {
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            for (const s of setters) { s.x(nx * -40 * s.d); s.y(ny * -30 * s.d); }
            if (btn && bx && by) {
              const r = btn.getBoundingClientRect();
              const dx = e.clientX - (r.left + r.width / 2);
              const dy = e.clientY - (r.top + r.height / 2);
              const near = Math.hypot(dx, dy) < 120;
              bx(near ? dx * 0.3 : 0);
              by(near ? dy * 0.3 : 0);
            }
          };
          el.addEventListener("pointermove", move);
          off = () => el.removeEventListener("pointermove", move);
        }

        // Pause the capsule when the hero is off screen.
        const st = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? cycle.resume() : cycle.pause()) });

        return () => { off?.(); cycle.kill(); st.kill(); split.revert(); };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="hero-kinetic relative isolate overflow-hidden">
      <div className="landing-dots pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        {TILES.map((t) => (
          <div key={t.src} data-tile data-depth={t.depth} className={`absolute ${t.cls} will-change-transform`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/seed/${t.src}.svg`} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl ring-1 ring-border" />
          </div>
        ))}
      </div>

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
        <p data-hero-fade className="mx-auto flex items-center gap-3 text-micro font-medium uppercase tracking-[0.2em] text-muted">
          <span className="h-px w-8 bg-border" /> A home for your collections <span className="h-px w-8 bg-border" />
        </p>

        <h1 data-hero-title className="hero-title mx-auto mt-8 max-w-5xl text-center font-semibold">
          Collect what
          <br />
          you{" "}
          <span data-pill className="hero-pill relative mx-[0.06em] inline-block overflow-hidden rounded-full align-middle ring-1 ring-border" aria-hidden>
            {PILL.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} data-pill-img src={`/seed/${src}.svg`} alt="" className="absolute inset-0 size-full object-cover" style={i ? { opacity: 0, visibility: "hidden" } : undefined} />
            ))}
          </span>{" "}
          love.
        </h1>

        <p data-hero-fade className="mx-auto mt-8 max-w-md text-pretty text-center text-lede text-muted">
          Pages and shelves for the things you collect. Paste a link or snap a photo, and nook builds the shelf.
        </p>

        <div data-hero-fade className="mt-10 flex flex-col items-center gap-3">
          <Link data-magnetic href="/signup" className="group inline-flex h-14 items-center gap-3 rounded-full bg-foreground pl-7 pr-2 text-body font-semibold text-background shadow-lg will-change-transform">
            Start your nook, free
            <span className="grid size-10 place-items-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover:rotate-[-45deg]">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
          <p className="text-meta text-muted">One page free forever. No card needed.</p>
        </div>

        <a href="#showcase" data-hero-fade className="mx-auto mt-14 flex items-center gap-2 text-micro font-medium uppercase tracking-[0.2em] text-muted hover:text-foreground">
          <ArrowDown className="size-3.5 motion-safe:animate-bounce" aria-hidden /> See it in action
        </a>
      </div>
    </section>
  );
}
