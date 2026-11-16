"use client";

import { useRef } from "react";
import { ImageIcon, Link2, Share2 } from "lucide-react";
import { ensureScrollTrigger, ensureSplitText, gsap, useGSAP } from "@/lib/gsap";

const STEPS = [
  { icon: Link2, n: "01", title: "Create a page", body: "Start with one. Add more as your collections grow." },
  { icon: ImageIcon, n: "02", title: "Stock your collections", body: "Paste a link or snap a photo. nook finds the images." },
  { icon: Share2, n: "03", title: "Share it", body: "One link to every collection you choose to show." },
] as const;

/** Scroll-scrubbed statement (words light up as you read) followed by three steps that rise in. */
export function Story() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        ensureScrollTrigger();
        const split = ensureSplitText().create("[data-statement]", { type: "words" });
        gsap.fromTo(split.words, { opacity: 0.14 }, {
          opacity: 1, stagger: 0.1, ease: "none",
          scrollTrigger: { trigger: "[data-statement]", start: "top 80%", end: "bottom 45%", scrub: 0.5 },
        });
        gsap.from("[data-step]", {
          y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "expo.out",
          scrollTrigger: { trigger: "[data-steps]", start: "top 85%", once: true },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <p data-statement className="max-w-4xl text-balance text-[clamp(1.6rem,1rem+2.6vw,3rem)] font-semibold leading-[1.15] tracking-tight">
          Your taste is scattered across screenshots, bookmarks and notes apps. nook gathers it into collections that look as good as the things on them.
        </p>
        <div data-steps className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
          {STEPS.map(({ icon: Icon, n, title, body }) => (
            <div key={n} data-step className="group bg-background p-6 transition-colors duration-300 hover:bg-surface sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-micro font-medium tracking-[0.2em] text-muted">{n}</span>
                <Icon className="size-5 text-muted transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 group-hover:text-foreground" aria-hidden strokeWidth={1.8} />
              </div>
              <h3 className="mt-10 text-heading font-semibold">{title}</h3>
              <p className="mt-1.5 text-meta text-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
