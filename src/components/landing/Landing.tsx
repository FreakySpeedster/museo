"use client";

import { Check, Globe, History, SunMoon, type LucideIcon } from "lucide-react";
import { Fragment, useRef, type ReactNode } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { LinkButton } from "@/components/ui/Button";
import { ScrollTrigger, canHover, gsap, reducedMotion, useGSAP } from "@/lib/gsap";

const Tick = ({ children }: { children: ReactNode }) => (
  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-accent" aria-hidden strokeWidth={2.6} />{children}</li>
);

const COLLAGE = [
  { src: "/seed/05-kind-of-blue.svg", label: "Kind of Blue", cat: "music", shelf: "On repeat", cls: "left-[2%] top-[6%] w-[44%] -rotate-6", depth: 18 },
  { src: "/seed/16-monstera.svg", label: "Monstera", cat: "plants", shelf: "Leafy friends", cls: "right-[0%] top-[0%] w-[42%] rotate-6", depth: 28 },
  { src: "/seed/23-patagonia.svg", label: "Patagonia", cat: "travel", shelf: "Places I’ve been", cls: "left-[22%] top-[38%] w-[48%] rotate-2", depth: 40 },
  { src: "/seed/09-next-js.svg", label: "next.js", cat: "code", shelf: "Open source", cls: "right-[2%] top-[56%] w-[36%] -rotate-3", depth: 24 },
  { src: "/seed/01-dune.svg", label: "Dune", cat: "books", shelf: "Reading", cls: "left-[0%] top-[62%] w-[34%] rotate-[8deg]", depth: 32 },
];

const MARQUEE: Array<[string, string]> = [
  ["books", "Books"], ["vinyl", "Records"], ["film-tv", "Films"], ["games", "Games"], ["art", "Art"], ["photography", "Photos"], ["sneakers", "Sneakers"],
  ["food", "Recipes"], ["travel", "Travel"], ["tech", "Gadgets"], ["plants", "Plants"], ["toys", "Figures"], ["code", "Side projects"], ["reading", "Reads"],
  ["fragrance", "Fragrance"], ["watches", "Watches"], ["lego", "LEGO"], ["tcg", "Trading cards"],
];

const STEPS = [
  ["01", "Create a page", "Pages are themed homes for related collections — “Music”, “Travel”, “Desk”. Your first one is free."],
  ["02", "Stock your shelves", "Up to five shelves per page, each holding one category. Drop in a link or a photo."],
  ["03", "Share the timeline", "Everything you add lands on your timeline, and in the feeds of everyone who follows you."],
];

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);

      // Hero text: split into words and spring them up.
      const words = q("[data-word]");
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(words, { yPercent: 120, rotate: 6, opacity: 0, duration: 1, stagger: 0.09 })
        .from(q("[data-hero-fade]"), { y: 24, opacity: 0, duration: 0.7, stagger: 0.1 }, "-=0.5")
        .from(q("[data-collage-card]"), { scale: 0.4, y: 120, opacity: 0, rotation: () => gsap.utils.random(-25, 25), duration: 1.1, ease: "back.out(1.6)", stagger: 0.12 }, 0.2);

      // Continuous floating
      q("[data-collage-card]").forEach((el, i) => {
        gsap.to(el.querySelector("[data-float]"), { y: i % 2 ? -14 : 14, rotation: i % 2 ? 1.5 : -1.5, duration: 2.4 + i * 0.3, ease: "sine.inOut", repeat: -1, yoyo: true });
      });

      // Mouse parallax on collage
      const stage = root.current?.querySelector<HTMLElement>("[data-stage]");
      if (stage && canHover()) {
        const move = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          q("[data-collage-card]").forEach((el) => {
            const d = Number(el.getAttribute("data-depth"));
            gsap.to(el, { x: px * d * 1.6, y: py * d * 1.6, duration: 0.8, ease: "power3.out", overwrite: "auto" });
          });
        };
        window.addEventListener("pointermove", move);
        return () => window.removeEventListener("pointermove", move);
      }
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);
      // Marquee
      const track = root.current?.querySelector("[data-marquee]");
      if (track) gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });

      // Section reveals
      q("[data-reveal-section]").forEach((el) => {
        gsap.from(el.querySelectorAll("[data-reveal]"), {
          y: 50, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.14,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        });
      });

      // Steps: connecting line draws, numbers count in
      gsap.fromTo(q("[data-step-line]"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", ease: "none", scrollTrigger: { trigger: "[data-steps]", start: "top 75%", end: "bottom 60%", scrub: true } });

      // Demo shelf: horizontal drift with scroll
      gsap.to(q("[data-drift]"), { xPercent: -12, ease: "none", scrollTrigger: { trigger: "[data-drift-wrap]", start: "top bottom", end: "bottom top", scrub: true } });

      // CTA pulse
      gsap.from(q("[data-cta]"), { scale: 0.92, opacity: 0, duration: 0.9, ease: "back.out(1.7)", scrollTrigger: { trigger: "[data-cta]", start: "top 85%", once: true } });
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  const headline = ["Show", "off", "what", "you", "collect."];

  return (
    <div ref={root} className="overflow-x-clip">
      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <p data-hero-fade className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-card">
            <span className="size-1.5 rounded-full bg-accent" /> Social media, but for the things you love
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl" aria-label="Show off what you collect.">
            {headline.map((w, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="inline-block overflow-hidden pb-2 align-bottom" aria-hidden>
                  <span data-word className={i >= 3 ? "inline-block bg-gradient-to-r from-accent to-amber-400 bg-clip-text text-transparent" : "inline-block"}>{w}</span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p data-hero-fade className="mt-6 max-w-xl text-lg text-muted">
            Build pages. Stock shelves. Drop in links and photos — Shelfie pulls the cover image for you. Everything you add flows onto your timeline for friends to follow.
          </p>
          <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">Start your first shelf — free</LinkButton>
            <LinkButton href="/pricing" variant="secondary" size="lg">See pricing</LinkButton>
          </div>
          <p data-hero-fade className="mt-4 text-xs text-muted">No credit card. Your first page is free forever.</p>
        </div>

        <div data-stage className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
          {COLLAGE.map((c, i) => (
            <div key={i} data-collage-card data-depth={c.depth} className={`absolute ${c.cls}`}>
              <div data-float className="overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" />
                <div className="px-1.5 pb-1 pt-2">
                  <p className="truncate text-xs font-semibold">{c.label}</p>
                  <p className="flex items-center gap-1 truncate text-[10px] text-muted"><CategoryIcon category={c.cat} className="size-3 shrink-0" />{c.shelf}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-y border-line bg-surface/70 py-4" aria-hidden>
        <div className="flex w-max gap-3 whitespace-nowrap" data-marquee>
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-1.5 text-sm font-medium text-muted"><CategoryIcon category={m[0]} className="size-4 text-accent" />{m[1]}</span>
          ))}
        </div>
      </div>

      {/* STEPS */}
      <section data-reveal-section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <h2 data-reveal className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">A shelf for everything you’re into.</h2>
        <p data-reveal className="mt-3 max-w-xl text-muted">Three simple ideas — pages, shelves and items — keep even the biggest collections beautifully tidy.</p>
        <div data-steps className="relative mt-12 grid gap-5 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-9 hidden h-0.5 bg-line md:block" aria-hidden />
          <div data-step-line className="absolute left-0 right-0 top-9 hidden h-0.5 bg-gradient-to-r from-accent to-amber-400 md:block" aria-hidden />
          {STEPS.map(([n, t, d]) => (
            <div key={n} data-reveal className="relative rounded-3xl border border-line bg-surface p-6 shadow-card">
              <span className="relative z-10 grid size-[3.1rem] place-items-center rounded-2xl bg-accent text-lg font-bold text-accent-ink shadow-[0_8px_24px_-8px_var(--accent)]">{n}</span>
              <h3 className="mt-5 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO SHELF */}
      <section data-drift-wrap className="overflow-hidden bg-surface-2/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Links become gorgeous cards.</h2>
          <p className="mt-2 max-w-xl text-muted">Paste a URL and Shelfie grabs the page’s image, title and description. Or upload your own photos.</p>
        </div>
        <div data-drift className="mt-10 flex w-[140%] gap-4 px-4 sm:px-6" aria-hidden>
          {[ "01-dune", "05-kind-of-blue", "09-next-js", "16-monstera", "22-lisbon", "31-super-metroid", "35-blade-runner", "13-keyboard", "28-blue-hour", "26-onigiri" ].map((s) => (
            <div key={s} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/seed/${s}.svg`} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="plank mx-auto mt-4 max-w-6xl" aria-hidden />
      </section>

      {/* FEATURES */}
      <section data-reveal-section className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:px-6 md:grid-cols-3">
        {([
          [History, "A timeline that writes itself", "Every item you add shows up on your profile timeline — a living diary of your taste."],
          [Globe, "Public by default", "Every profile lives at /u/you. Share it anywhere; no account needed to browse."],
          [SunMoon, "Made to be lived in", "Dark mode, instant page switching, drag-to-reorder shelves and a design that stays out of the way."],
        ] as Array<[LucideIcon, string, string]>).map(([Icon, t, d]) => (
          <div key={t} data-reveal className="rounded-3xl border border-line bg-surface p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-6" aria-hidden strokeWidth={1.8} /></span>
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>

      {/* PRICING TEASER */}
      <section data-reveal-section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-reveal className="rounded-3xl border border-line bg-surface p-7">
            <p className="text-sm font-medium text-muted">Free</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">$0</p>
            <ul className="mt-5 space-y-2 text-sm"><Tick>1 page</Tick><Tick>5 shelves per page</Tick><Tick>Unlimited links &amp; photos</Tick><Tick>Public profile &amp; timeline</Tick></ul>
          </div>
          <div data-reveal className="relative overflow-hidden rounded-3xl border-2 border-accent bg-surface p-7 shadow-[0_20px_60px_-20px_var(--accent)]">
            <span className="absolute right-5 top-5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase text-accent-ink">Plus</span>
            <p className="text-sm font-medium text-muted">Shelfie Plus</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">$4<span className="text-base font-normal text-muted"> / month</span></p>
            <ul className="mt-5 space-y-2 text-sm"><Tick>Everything in Free</Tick><Tick><strong>Unlimited pages</strong> + page switcher</Tick><Tick>Support an indie product</Tick></ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div data-cta className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-bg sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/40 blur-3xl" aria-hidden />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Your collection deserves a better shelf.</h2>
          <p className="relative mx-auto mt-3 max-w-lg opacity-70">Join in a minute. Add your first item in two.</p>
          <div className="relative mt-8 flex justify-center"><LinkButton href="/signup" size="lg">Create your Shelfie</LinkButton></div>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>© {new Date().getFullYear()} Shelfie</span>
          <span>Made for collectors, hoarders and curators.</span>
        </footer>
      </section>
    </div>
  );
}
