"use client";

import { useRef } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";

const CATEGORIES: Array<[string, string]> = [
  ["books", "Books"],
  ["vinyl", "Records"],
  ["film-tv", "Films"],
  ["games", "Games"],
  ["art", "Art"],
  ["photography", "Photos"],
  ["sneakers", "Sneakers"],
  ["food", "Recipes"],
  ["travel", "Travel"],
  ["tech", "Gadgets"],
  ["plants", "Plants"],
  ["toys", "Figures"],
  ["code", "Side projects"],
  ["fragrance", "Fragrance"],
  ["watches", "Watches"],
  ["music", "Music"],
  ["fashion", "Fashion"],
  ["comics", "Comics"],
];

/** Continuous category strip. Plays only while on screen; static when reduced motion is on. */
export function CategoryMarquee() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = root.current?.querySelector<HTMLElement>("[data-marquee]");
      if (!track || reducedMotion()) return;
      const ScrollTrigger = ensureScrollTrigger();
      const tween = gsap.to(track, { xPercent: -50, duration: 40, ease: "none", repeat: -1, paused: true });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => tween.play(),
        onEnterBack: () => tween.play(),
        onLeave: () => tween.pause(),
        onLeaveBack: () => tween.pause(),
      });
    },
    { scope: root },
  );

  const pills = [...CATEGORIES, ...CATEGORIES];

  return (
    <div ref={root} className="overflow-hidden border-y border-border py-4" aria-hidden>
      <div className="flex w-max gap-2 whitespace-nowrap will-change-transform sm:gap-3" data-marquee>
        {pills.map(([id, label], i) => (
          <span
            key={`${id}-${i}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-meta font-medium text-muted"
          >
            <CategoryIcon category={id} className="size-4" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
