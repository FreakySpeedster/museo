"use client";

import { useRef } from "react";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

interface ShowcaseItem { title: string; image: string; thoughts?: string }
interface ShowcasePage {
  title: string;
  owner: string;
  handle: string;
  category: string;
  shelves: { name: string; items: ShowcaseItem[] }[];
}

const PAGES: ShowcasePage[] = [
  {
    title: "Music",
    owner: "Alex Rivera",
    handle: "alex",
    category: "music",
    shelves: [{
      name: "On rotation",
      items: [
        { title: "Kind of Blue", image: "/seed/05-kind-of-blue.svg", thoughts: "The record I put on when the room needs to breathe." },
        { title: "In Rainbows", image: "/seed/08-in-rainbows.svg" },
        { title: "Rumours", image: "/seed/07-rumours.svg" },
        { title: "Random Access Memories", image: "/seed/06-random-access-memories.svg" },
      ],
    }],
  },
  {
    title: "Books",
    owner: "Sam Chen",
    handle: "sam",
    category: "books",
    shelves: [{
      name: "Currently reading",
      items: [
        { title: "Dune", image: "/seed/01-dune.svg", thoughts: "Still the world I want to get lost in." },
        { title: "Project Hail Mary", image: "/seed/02-project-hail-mary.svg" },
        { title: "The Pragmatic Programmer", image: "/seed/03-the-pragmatic-programmer.svg" },
        { title: "Thinking, Fast and Slow", image: "/seed/04-thinking-fast-and-slow.svg" },
      ],
    }],
  },
  {
    title: "Sneakers",
    owner: "Jordan Blake",
    handle: "jordan",
    category: "sneakers",
    shelves: [{
      name: "The rotation",
      items: [
        { title: "Daily pair", image: "/seed/13-keyboard.svg", thoughts: "Broken in and still going." },
        { title: "Weekend pick", image: "/seed/20-terracotta.svg" },
        { title: "Clean white", image: "/seed/21-self-watering.svg" },
        { title: "Travel pair", image: "/seed/22-lisbon.svg" },
      ],
    }],
  },
  {
    title: "Films",
    owner: "Riley Park",
    handle: "riley",
    category: "film-tv",
    shelves: [{
      name: "Rewatch list",
      items: [
        { title: "Blade Runner 2049", image: "/seed/35-blade-runner.svg", thoughts: "The light in this one still stops me." },
        { title: "Spirited Away", image: "/seed/36-spirited-away.svg" },
        { title: "Akira", image: "/seed/37-akira.svg" },
        { title: "Super Metroid", image: "/seed/31-super-metroid.svg" },
      ],
    }],
  },
];

function ShowcaseCard({ page }: { page: ShowcasePage }) {
  return (
    <article className="w-[min(100%,28rem)] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-surface shadow-md sm:w-[min(100%,34rem)]">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-10 place-items-center rounded-full bg-surface-hover text-foreground">
          <CategoryIcon category={page.category} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-heading font-semibold">{page.owner}</p>
          <p className="text-caption text-muted">@{page.handle} · {page.title}</p>
        </div>
      </header>
      {page.shelves.map((shelf) => (
        <div key={shelf.name} className="px-5 py-4">
          <p className="mb-3 flex items-center gap-1.5 text-meta font-medium">
            <CategoryIcon category={page.category} className="size-4 text-muted" />
            {shelf.name}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {shelf.items.map((item) => (
              <figure key={item.title} className="overflow-hidden rounded-2xl border border-border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="space-y-1 p-2.5">
                  <p className="truncate text-meta font-semibold">{item.title}</p>
                  {item.thoughts && <p className="line-clamp-2 text-caption text-muted">{item.thoughts}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}

export function PageShowcase({ variant = "section" }: { variant?: "section" | "framed" }) {
  if (variant === "framed") {
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-md" aria-label="Example nook pages">
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth p-4 sm:gap-8 sm:p-6">
          {PAGES.map((page) => (
            <ShowcaseCard key={page.title} page={page} />
          ))}
        </div>
      </div>
    );
  }
  return <PinnedShowcase />;
}

function PinnedShowcase() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion() || !root.current || !track.current) return;
      const ScrollTrigger = ensureScrollTrigger();
      const section = root.current;
      const row = track.current;
      const distance = () => Math.max(0, row.scrollWidth - section.clientWidth);
      const tween = gsap.to(row, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() + section.clientHeight * 0.4}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        ScrollTrigger.refresh();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-x-auto border-t border-border bg-background motion-safe:overflow-hidden" aria-label="Example nook pages">
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-16 sm:px-6 sm:pt-20">
        <p className="text-meta font-medium text-muted">A page for every collection</p>
        <h2 className="mt-2 max-w-2xl text-title font-semibold tracking-tight">Music, books, sneakers, films — each one a little nook.</h2>
      </div>
      <div
        ref={track}
        data-showcase-track
        className="flex gap-5 px-4 pb-16 pt-8 sm:gap-8 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] motion-reduce:overflow-x-auto motion-reduce:scroll-smooth motion-reduce:snap-x motion-reduce:snap-mandatory"
      >
        {PAGES.map((page) => (
          <ShowcaseCard key={page.title} page={page} />
        ))}
      </div>
    </section>
  );
}
