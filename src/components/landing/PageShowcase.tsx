"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, reducedMotion, useGSAP } from "@/lib/gsap";
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
  likes: string[];
  comments: [string, string][];
}

const s = (f: string) => `/seed/${f}.svg`;

const PAGES: ShowcasePage[] = [
  {
    owner: "Alex Rivera", handle: "alex", title: "Music", category: "music", shelf: "On rotation",
    items: [["Kind of Blue", s("05-kind-of-blue")], ["In Rainbows", s("08-in-rainbows")], ["Rumours", s("07-rumours")], ["Random Access Memories", s("06-random-access-memories")], ["Blue Hour", s("28-blue-hour")], ["Mist", s("29-mist")]],
    likes: ["meera liked On rotation", "kabir liked Kind of Blue", "zoya saved In Rainbows"],
    comments: [["kabir", "Kind of Blue on vinyl is unreal."], ["zoya", "Rumours never gets old."], ["sam", "What turntable is this?"]],
  },
  {
    owner: "Sam Chen", handle: "sam", title: "Books", category: "books", shelf: "Currently reading",
    items: [["Dune", s("01-dune")], ["Project Hail Mary", s("02-project-hail-mary")], ["The Pragmatic Programmer", s("03-the-pragmatic-programmer")], ["Thinking, Fast and Slow", s("04-thinking-fast-and-slow")], ["Neon Rain", s("30-neon-rain")], ["Kyoto", s("24-kyoto")]],
    likes: ["zoya liked Dune", "riley liked Currently reading", "alex saved Project Hail Mary"],
    comments: [["aarav", "Adding Hail Mary to my list."], ["priya", "Dune made me reread it twice."], ["kai", "Pragmatic Programmer is a classic."]],
  },
  {
    owner: "Priya Nair", handle: "priya", title: "Plants", category: "plants", shelf: "Living room jungle",
    items: [["Monstera", s("16-monstera")], ["String of Pearls", s("17-string-of-pearls")], ["Fiddle Leaf Fig", s("18-fiddle-leaf-fig")], ["Snake Plant", s("19-snake-plant")], ["Terracotta pot", s("20-terracotta")], ["Self-watering pot", s("21-self-watering")]],
    likes: ["sam liked Monstera", "meera saved Snake Plant", "jordan liked Living room jungle"],
    comments: [["riley", "How do you keep the fig alive?"], ["zoya", "Those pearls look so healthy."], ["alex", "Need that terracotta pot."]],
  },
  {
    owner: "Jordan Blake", handle: "jordan", title: "Travel", category: "travel", shelf: "Places I loved",
    items: [["Lisbon", s("22-lisbon")], ["Patagonia", s("23-patagonia")], ["Kyoto", s("24-kyoto")], ["Dolomites", s("25-dolomites")], ["Onigiri", s("26-onigiri")], ["Pastel de nata", s("27-pastel-de-nata")]],
    likes: ["priya liked Places I loved", "kai saved Kyoto", "sam liked Dolomites"],
    comments: [["alex", "Patagonia is next for me."], ["meera", "That pastel de nata though."], ["kabir", "Kyoto in autumn is magic."]],
  },
  {
    owner: "Riley Park", handle: "riley", title: "Films", category: "film-tv", shelf: "Rewatch list",
    items: [["Blade Runner 2049", s("35-blade-runner")], ["Spirited Away", s("36-spirited-away")], ["Akira", s("37-akira")], ["Neon Rain", s("30-neon-rain")], ["Blue Hour", s("28-blue-hour")], ["Mist", s("29-mist")]],
    likes: ["jordan liked Spirited Away", "aarav saved Akira", "priya liked Rewatch list"],
    comments: [["meera", "That 2049 poster though."], ["kai", "Akira still looks futuristic."], ["sam", "Spirited Away, every winter."]],
  },
  {
    owner: "Kai Mori", handle: "kai", title: "Games", category: "games", shelf: "All-time favourites",
    items: [["Super Metroid", s("31-super-metroid")], ["Celeste", s("32-celeste")], ["Hades", s("33-hades")], ["Tetris", s("34-tetris")], ["Keyboard", s("13-keyboard")], ["Pixel Pad", s("15-pixel-pad")]],
    likes: ["kabir liked Hades", "riley saved Celeste", "zoya liked All-time favourites"],
    comments: [["sam", "Celeste made me cry, no shame."], ["jordan", "Hades soundtrack on repeat."], ["alex", "Super Metroid is perfect."]],
  },
];

const TICK_MS = 3000;

/** Floating activity note. When `body`/`title` change it swaps with a short GSAP out/in (transform + opacity only). */
function Note({ className, icon, title, body }: { className: string; icon: ReactNode; title: string; body?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ title, body });
  const first = useRef(true);

  useGSAP(() => {
    if (first.current) { first.current = false; return; }
    if (shown.title === title && shown.body === body) return;
    const node = el.current;
    if (!node || reducedMotion()) { setShown({ title, body }); return; }
    gsap.killTweensOf(node);
    gsap.to(node, {
      autoAlpha: 0, y: -6, scale: 0.96, duration: 0.22, ease: "power2.in", overwrite: true,
      onComplete: () => {
        setShown({ title, body });
        gsap.fromTo(node, { autoAlpha: 0, y: 8, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)", clearProps: "transform" });
      },
    });
  }, { dependencies: [title, body] });

  return (
    <div className={clsx("pointer-events-none absolute z-10", className)} aria-hidden>
      <div ref={el} className="landing-float max-w-[13.5rem] rounded-xl border border-border bg-surface-raised/95 px-3 py-2 shadow-lg backdrop-blur-md will-change-transform">
        <div className="flex items-center gap-1.5 text-micro text-muted">{icon}<span className="truncate">{shown.title}</span></div>
        {shown.body && <p className="mt-0.5 truncate text-caption font-medium">{shown.body}</p>}
      </div>
    </div>
  );
}

function ShowcaseCard({ page, i, tick }: { page: ShowcasePage; i: number; tick: number }) {
  const flip = i % 2 === 1;
  // Offset per card so neighbours never swap in lockstep: likes change on even ticks, comments on odd ticks.
  const like = page.likes[Math.floor((tick + i) / 2) % page.likes.length];
  const [who, text] = page.comments[Math.floor((tick + i + 1) / 2) % page.comments.length];
  return (
    <div data-card className="relative shrink-0">
      <Note
        className={clsx("-top-5", flip ? "-right-3 rotate-[2deg]" : "-left-3 rotate-[-2deg]")}
        icon={<Heart className="size-3 text-[#FF4D6D]" fill="currentColor" />}
        title={like}
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
              <img src={img} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-lg object-cover" />
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
        title={`${who} commented`}
        body={text}
      />
    </div>
  );
}

/**
 * Compact rail of example pages. Every 3s it glides to the next profile (GSAP tween on scrollLeft, wrapping at the end)
 * and the activity notes swap. Pauses while hovered, focused, touched, off-screen, or the tab is hidden; off under reduced motion.
 * The mouse wheel scrolls it sideways until an edge, then the page scrolls.
 */
export function PageShowcase() {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const start = el.scrollLeft <= 2;
        const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        setEdge((e) => (e.start === start && e.end === end ? e : { start, end }));
      });
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if ((el.scrollLeft <= 0 && e.deltaY < 0) || (el.scrollLeft >= max - 1 && e.deltaY > 0)) return;
      e.preventDefault();
      gsap.killTweensOf(el);
      el.scrollLeft += e.deltaY;
    };
    sync();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Autoplay loop.
  useEffect(() => {
    const el = rail.current;
    if (!el || reducedMotion()) return;
    let hovering = false;
    let visible = false;
    let resumeAt = 0;
    const hold = () => { resumeAt = performance.now() + 5000; gsap.killTweensOf(el); };
    const enter = () => { hovering = true; };
    const leave = () => { hovering = false; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.25 });
    io.observe(el);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("focusin", hold);

    const id = window.setInterval(() => {
      if (!visible || hovering || document.hidden || performance.now() < resumeAt) return;
      setTick((t) => t + 1);
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0 || cards.length < 2) return;
      const pad = cards[0].offsetLeft;
      const next = cards.find((c) => c.offsetLeft - pad > el.scrollLeft + 4);
      const target = !next || el.scrollLeft >= max - 2 ? 0 : Math.min(max, next.offsetLeft - pad);
      gsap.to(el, { scrollLeft: target, duration: target === 0 ? 1.1 : 0.9, ease: "power3.inOut", overwrite: true });
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      io.disconnect();
      gsap.killTweensOf(el);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("focusin", hold);
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    gsap.to(el, { scrollLeft: Math.max(0, Math.min(max, el.scrollLeft + dir * 300)), duration: 0.6, ease: "power3.out", overwrite: true });
  };
  const arrow = "absolute top-1/2 z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-raised/90 text-foreground shadow-md backdrop-blur transition-opacity md:grid";

  return (
    <div className="relative rounded-3xl border border-border bg-surface/60 shadow-md backdrop-blur" aria-label="Example nook pages">
      <div
        ref={rail}
        className="showcase-rail no-scrollbar flex gap-5 overflow-x-auto overscroll-x-contain px-5 pb-12 pt-10 sm:gap-6 sm:px-8"
        data-start={edge.start || undefined}
        data-end={edge.end || undefined}
      >
        {PAGES.map((page, i) => <ShowcaseCard key={page.handle} page={page} i={i} tick={tick} />)}
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
