"use client";

import { useRef } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ensureScrollTrigger, gsap, useGSAP } from "@/lib/gsap";

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

export const PAGES: ShowcasePage[] = [
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

const TICK = 3; // seconds per profile
const DEPTH = [
  { y: 0, scale: 1, rotate: 0, autoAlpha: 1 },
  { y: -22, scale: 0.94, rotate: 2.5, autoAlpha: 0.75 },
  { y: -42, scale: 0.88, rotate: -2.5, autoAlpha: 0.45 },
];
const HIDDEN = { y: -56, scale: 0.84, rotate: 0, autoAlpha: 0 };

function DeckCard({ page, i }: { page: ShowcasePage; i: number }) {
  return (
    <div data-deck-card data-i={i} className="deck-card absolute inset-x-0 top-0 mx-auto w-full" style={{ zIndex: 10 - i }}>
      <article className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-2xl">
        <header className="flex items-center gap-3 px-5 pb-3 pt-5">
          <span className="grid size-10 place-items-center rounded-full bg-surface-hover">
            <CategoryIcon category={page.category} className="size-5" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-body font-semibold">{page.owner}</p>
            <p className="truncate text-caption text-muted">@{page.handle} · {page.title}</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-caption font-medium">Follow</span>
        </header>
        <p className="px-5 text-meta font-medium text-muted">{page.shelf}</p>
        <div className="grid grid-cols-3 gap-2 p-5 pt-3">
          {page.items.map(([title, img]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={title} src={img} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      </article>
      <div data-note="like" className="deck-note -left-4 -top-5 rotate-[-3deg] sm:-left-12">
        <Heart className="size-3.5 shrink-0 text-[#FF4D6D]" fill="currentColor" aria-hidden />
        <span data-text className="truncate">{page.likes[0]}</span>
      </div>
      <div data-note="comment" className="deck-note -right-4 bottom-10 max-w-[15rem] flex-col !items-start rotate-[2deg] sm:-right-14">
        <span className="flex items-center gap-1.5 text-micro text-muted">
          <MessageCircle className="size-3.5 text-accent" aria-hidden /> <span data-who>{page.comments[0][0]}</span> commented
        </span>
        <span data-text className="truncate text-meta font-medium">{page.comments[0][1]}</span>
      </div>
    </div>
  );
}

/**
 * A deck of example profiles. Every 3s the front card flicks away to the back, the rest step forward,
 * and the new front card's like/comment notes pop in with fresh activity. Transforms and opacity only;
 * text swaps write textContent directly so React never re-renders mid-animation. Plays only on screen.
 */
export function PageShowcase() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current!;
      const cards = gsap.utils.toArray<HTMLElement>("[data-deck-card]", el);
      const order = cards.map((_, i) => i);
      const rounds = cards.map(() => 0);
      const labels = gsap.utils.toArray<HTMLElement>("[data-deck-label]", el);
      const bar = el.querySelector<HTMLElement>("[data-deck-bar]");
      const counter = el.querySelector<HTMLElement>("[data-deck-count]");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const place = (animate: boolean) => {
        order.forEach((ci, depth) => {
          const vars = { ...(DEPTH[depth] ?? HIDDEN), zIndex: 10 - depth };
          if (animate) gsap.to(cards[ci], { ...vars, duration: 0.8, ease: "expo.out", overwrite: "auto" });
          else gsap.set(cards[ci], vars);
          const notes = cards[ci].querySelectorAll("[data-note]");
          if (depth !== 0) gsap.set(notes, { autoAlpha: 0, scale: 0.6 });
        });
      };
      const setLabel = () => {
        labels.forEach((l, i) => l.classList.toggle("is-active", i === order[0]));
        if (counter) counter.textContent = String(order[0] + 1).padStart(2, "0");
      };
      const popNotes = (ci: number) => {
        const page = PAGES[ci];
        const r = rounds[ci];
        const c = cards[ci];
        const like = c.querySelector<HTMLElement>("[data-note=like] [data-text]");
        const who = c.querySelector<HTMLElement>("[data-note=comment] [data-who]");
        const text = c.querySelector<HTMLElement>("[data-note=comment] [data-text]");
        if (like) like.textContent = page.likes[r % page.likes.length];
        if (who) who.textContent = page.comments[r % page.comments.length][0];
        if (text) text.textContent = page.comments[r % page.comments.length][1];
        gsap.fromTo(c.querySelectorAll("[data-note]"), { autoAlpha: 0, scale: 0.6, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, stagger: 0.18, delay: 0.25, ease: "back.out(2)", overwrite: true });
      };

      place(false);
      setLabel();
      gsap.set(cards[order[0]].querySelectorAll("[data-note]"), { autoAlpha: 1, scale: 1 });
      if (reduce) return;

      // contextSafe: tweens created later from timers/handlers are still reverted on unmount.
      const advance = contextSafe!(() => {
        const front = order.shift()!;
        order.push(front);
        rounds[front] += 1;
        const c = cards[front];
        gsap.to(c.querySelectorAll("[data-note]"), { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: "power2.in", overwrite: true });
        gsap.timeline()
          .to(c, { xPercent: -115, rotate: -14, y: 30, duration: 0.6, ease: "power3.in" })
          .set(c, { xPercent: 0, ...HIDDEN, zIndex: 0 })
          .call(() => place(true), [], 0.28);
        setLabel();
        popNotes(order[0]);
        if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: TICK, ease: "none", overwrite: true });
      });

      if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: TICK, ease: "none" });
      const loop = gsap.delayedCall(TICK, function tick() { advance(); loop.restart(true); });

      const ScrollTrigger = ensureScrollTrigger();
      let hovered = false;
      let onScreen = false;
      const sync = () => {
        const run = onScreen && !hovered;
        loop.paused(!run);
        if (bar) gsap.getTweensOf(bar).forEach((t) => t.paused(!run));
      };
      const st = ScrollTrigger.create({ trigger: el, start: "top 85%", end: "bottom 15%", onToggle: (s) => { onScreen = s.isActive && !document.hidden; sync(); } });
      const stage = el.querySelector<HTMLElement>("[data-deck-stage]")!;
      const enter = () => { hovered = true; sync(); };
      const leave = () => { hovered = false; sync(); };
      stage.addEventListener("pointerenter", enter);
      stage.addEventListener("pointerleave", leave);
      const jump = contextSafe!((e: Event) => {
        const target = Number((e.currentTarget as HTMLElement).dataset.i);
        let guard = 0;
        while (order[0] !== target && guard++ < cards.length) advance();
        loop.restart(true);
        sync();
      });
      labels.forEach((l) => l.addEventListener("click", jump));
      const vis = () => { onScreen = st.isActive && !document.hidden; sync(); };
      document.addEventListener("visibilitychange", vis);
      onScreen = st.isActive;
      sync();

      return () => {
        loop.kill();
        st.kill();
        stage.removeEventListener("pointerenter", enter);
        stage.removeEventListener("pointerleave", leave);
        labels.forEach((l) => l.removeEventListener("click", jump));
        document.removeEventListener("visibilitychange", vis);
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="showcase" className="relative overflow-hidden border-t border-border" aria-label="Example nook profiles">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div>
          <p className="text-micro font-medium uppercase tracking-[0.2em] text-muted">
            <span data-deck-count>01</span> / {String(PAGES.length).padStart(2, "0")} — Live on nook
          </p>
          <h2 className="mt-4 text-title font-semibold tracking-tight">Every collection gets a little home.</h2>
          <p className="mt-4 max-w-md text-body text-muted">Records on rotation, the books on your nightstand, the plants you keep alive. Friends drop by, like a shelf, leave a note.</p>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Profiles">
            {PAGES.map((p, i) => (
              <li key={p.handle}>
                <button type="button" data-deck-label data-i={i} className="deck-label">
                  <CategoryIcon category={p.category} className="size-3.5" /> {p.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 h-px w-full max-w-xs overflow-hidden bg-border" aria-hidden>
            <div data-deck-bar className="h-full origin-left scale-x-0 bg-foreground" />
          </div>
        </div>

        <div data-deck-stage className="relative mx-auto h-[25rem] w-full max-w-[22rem] pt-12 sm:h-[27rem] sm:max-w-[24rem]">
          <div className="relative size-full">
            {PAGES.map((page, i) => <DeckCard key={page.handle} page={page} i={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
