"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import clsx from "clsx";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

interface ShowcasePage {
  owner: string;
  handle: string;
  title: string;
  category: string;
  shelf: string;
  items: [string, string][];
  like: { who: string; what: string };
  comment: { who: string; text: string };
}

const s = (f: string) => `/seed/${f}.svg`;

const PAGES: ShowcasePage[] = [
  {
    owner: "Alex Rivera", handle: "alex", title: "Music", category: "music", shelf: "On rotation",
    items: [["Kind of Blue", s("05-kind-of-blue")], ["In Rainbows", s("08-in-rainbows")], ["Rumours", s("07-rumours")], ["Random Access Memories", s("06-random-access-memories")], ["Blue Hour", s("28-blue-hour")], ["Mist", s("29-mist")]],
    like: { who: "meera", what: "liked On rotation" }, comment: { who: "kabir", text: "Kind of Blue on vinyl is unreal." },
  },
  {
    owner: "Sam Chen", handle: "sam", title: "Books", category: "books", shelf: "Currently reading",
    items: [["Dune", s("01-dune")], ["Project Hail Mary", s("02-project-hail-mary")], ["The Pragmatic Programmer", s("03-the-pragmatic-programmer")], ["Thinking, Fast and Slow", s("04-thinking-fast-and-slow")], ["Neon Rain", s("30-neon-rain")], ["Kyoto", s("24-kyoto")]],
    like: { who: "zoya", what: "liked Dune" }, comment: { who: "aarav", text: "Adding Hail Mary to my list." },
  },
  {
    owner: "Priya Nair", handle: "priya", title: "Plants", category: "plants", shelf: "Living room jungle",
    items: [["Monstera", s("16-monstera")], ["String of Pearls", s("17-string-of-pearls")], ["Fiddle Leaf Fig", s("18-fiddle-leaf-fig")], ["Snake Plant", s("19-snake-plant")], ["Terracotta pot", s("20-terracotta")], ["Self-watering pot", s("21-self-watering")]],
    like: { who: "sam", what: "liked Monstera" }, comment: { who: "riley", text: "How do you keep the fig alive?" },
  },
  {
    owner: "Jordan Blake", handle: "jordan", title: "Travel", category: "travel", shelf: "Places I loved",
    items: [["Lisbon", s("22-lisbon")], ["Patagonia", s("23-patagonia")], ["Kyoto", s("24-kyoto")], ["Dolomites", s("25-dolomites")], ["Onigiri", s("26-onigiri")], ["Pastel de nata", s("27-pastel-de-nata")]],
    like: { who: "priya", what: "liked Places I loved" }, comment: { who: "alex", text: "Patagonia is next for me." },
  },
  {
    owner: "Riley Park", handle: "riley", title: "Films", category: "film-tv", shelf: "Rewatch list",
    items: [["Blade Runner 2049", s("35-blade-runner")], ["Spirited Away", s("36-spirited-away")], ["Akira", s("37-akira")], ["Neon Rain", s("30-neon-rain")], ["Blue Hour", s("28-blue-hour")], ["Mist", s("29-mist")]],
    like: { who: "jordan", what: "liked Spirited Away" }, comment: { who: "meera", text: "That 2049 poster though." },
  },
  {
    owner: "Kai Mori", handle: "kai", title: "Games", category: "games", shelf: "All-time favourites",
    items: [["Super Metroid", s("31-super-metroid")], ["Celeste", s("32-celeste")], ["Hades", s("33-hades")], ["Tetris", s("34-tetris")], ["Keyboard", s("13-keyboard")], ["Pixel Pad", s("15-pixel-pad")]],
    like: { who: "kabir", what: "liked Hades" }, comment: { who: "sam", text: "Celeste made me cry, no shame." },
  },
];

function Note({ className, icon, title, body }: { className: string; icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className={clsx("landing-float pointer-events-none absolute z-10 max-w-[13.5rem] rounded-xl border border-border bg-surface-raised/95 px-3 py-2 shadow-lg backdrop-blur-md", className)} aria-hidden>
      <div className="flex items-center gap-1.5 text-micro text-muted">{icon}<span className="truncate">{title}</span></div>
      {body && <p className="mt-0.5 truncate text-caption font-medium">{body}</p>}
    </div>
  );
}

function ShowcaseCard({ page, i }: { page: ShowcasePage; i: number }) {
  const flip = i % 2 === 1;
  return (
    <div className="relative shrink-0 snap-start">
      <Note
        className={clsx("-top-5", flip ? "-right-3 rotate-[2deg]" : "-left-3 rotate-[-2deg]")}
        icon={<Heart className="size-3 text-[#FF4D6D]" fill="currentColor" />}
        title={`${page.like.who} ${page.like.what}`}
      />
      <article className="w-[16.5rem] overflow-hidden rounded-2xl border border-border bg-background shadow-sm sm:w-[18rem]">
        <header className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3.5">
          <span className="grid size-8 place-items-center rounded-full bg-surface-hover">
            <CategoryIcon category={page.category} className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-meta font-semibold">{page.owner}</p>
            <p className="truncate text-micro text-muted">@{page.handle} · {page.title}</p>
          </div>
        </header>
        <p className="px-3.5 text-caption font-medium text-muted">{page.shelf}</p>
        <div className="grid grid-cols-3 gap-1.5 p-3.5 pt-2">
          {page.items.map(([title, img]) => (
            <figure key={title} className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              <figcaption className="mt-1 truncate text-micro text-muted">{title}</figcaption>
            </figure>
          ))}
        </div>
        <hr className="mx-3.5 border-0 border-t border-border" />
        <p className="px-3.5 py-2.5 text-micro text-muted">6 items · 1.{i + 2}k views</p>
      </article>
      <Note
        className={clsx("-bottom-6", flip ? "-left-4 rotate-[-2deg]" : "-right-4 rotate-[2deg]")}
        icon={<MessageCircle className="size-3 text-accent" />}
        title={`${page.comment.who} commented`}
        body={page.comment.text}
      />
    </div>
  );
}

/** Compact horizontal rail of example pages. Mouse wheel scrolls it sideways until an edge, then the page scrolls. */
export function PageShowcase() {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const sync = () => setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad sideways swipe: native
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= max - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    sync();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const nudge = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  const arrow = "absolute top-1/2 z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-raised/90 text-foreground shadow-md backdrop-blur transition-opacity md:grid";

  return (
    <div className="relative rounded-3xl border border-border bg-surface/60 shadow-md backdrop-blur" aria-label="Example nook pages">
      <div
        ref={rail}
        className="showcase-rail no-scrollbar flex gap-5 overflow-x-auto px-5 pb-12 pt-10 sm:gap-6 sm:px-8"
        data-start={edge.start || undefined}
        data-end={edge.end || undefined}
      >
        {PAGES.map((page, i) => <ShowcaseCard key={page.handle} page={page} i={i} />)}
      </div>
      <button type="button" aria-label="Scroll left" onClick={() => nudge(-1)} className={clsx(arrow, "-left-4", edge.start && "pointer-events-none opacity-0")}>
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => nudge(1)} className={clsx(arrow, "-right-4", edge.end && "pointer-events-none opacity-0")}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
