"use client";

import { Link2 } from "lucide-react";
import { useRef } from "react";
import { ensureScrollTrigger, gsap, reducedMotion, useGSAP } from "@/lib/gsap";

const READING = [
  { src: "/seed/01-dune.svg", title: "Dune" },
  { src: "/seed/04-thinking-fast-and-slow.svg", title: "Thinking, Fast and Slow" },
  { src: "/seed/03-the-pragmatic-programmer.svg", title: "The Pragmatic Programmer" },
] as const;

const PASTED = { src: "/seed/09-next-js.svg", title: "Next.js", url: "nextjs.org" };

const MUSIC = [
  { src: "/seed/05-kind-of-blue.svg", title: "Kind of Blue" },
  { src: "/seed/06-random-access-memories.svg", title: "Random Access Memories" },
  { src: "/seed/07-rumours.svg", title: "Rumours" },
  { src: "/seed/08-in-rainbows.svg", title: "In Rainbows" },
] as const;

function Card({ src, title }: { src: string; title: string }) {
  return (
    <figure className="min-w-0" data-card>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="aspect-square w-full rounded-lg border border-border bg-surface-hover object-cover" />
      <figcaption className="mt-1.5 truncate text-caption text-muted">{title}</figcaption>
    </figure>
  );
}

/** A looping, reduced-motion-safe preview of stocking a shelf and pasting a link. */
export function ProductDemo() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const ScrollTrigger = ensureScrollTrigger();
      const q = gsap.utils.selector(root);
      const readingCards = q("[data-shelf=reading] [data-drop]");
      const musicCards = q("[data-shelf=music] [data-drop]");
      const pasted = q("[data-pasted]")[0];
      const paste = q("[data-paste]")[0];
      const pasteUrl = q("[data-paste-url]")[0];
      const reading = q("[data-shelf=reading]")[0];
      const music = q("[data-shelf=music]")[0];
      const tabRead = q("[data-tab=reading]")[0];
      const tabMusic = q("[data-tab=music]")[0];
      const indicator = q("[data-tab-indicator]")[0];

      const setTab = (which: "reading" | "music", instant = false) => {
        const el = which === "reading" ? tabRead : tabMusic;
        if (!el || !indicator) return;
        const dur = instant ? 0 : 0.28;
        gsap.to(indicator, { x: el.offsetLeft, width: el.offsetWidth, duration: dur, ease: "power2.out", overwrite: "auto" });
        gsap.to(tabRead, { color: which === "reading" ? "var(--background)" : "var(--muted)", duration: dur, overwrite: "auto" });
        gsap.to(tabMusic, { color: which === "music" ? "var(--background)" : "var(--muted)", duration: dur, overwrite: "auto" });
      };

      if (reducedMotion()) {
        gsap.set(readingCards, { opacity: 1, y: 0 });
        gsap.set([paste, music, pasted, ...musicCards], { opacity: 0 });
        gsap.set(reading, { opacity: 1 });
        setTab("reading", true);
        return;
      }

      gsap.set(readingCards, { opacity: 0, y: 10 });
      gsap.set(musicCards, { opacity: 0, y: 10 });
      gsap.set(paste, { opacity: 0, y: 6 });
      gsap.set(pasteUrl, { opacity: 0 });
      gsap.set(pasted, { opacity: 0, y: 10 });
      gsap.set(music, { opacity: 0 });
      gsap.set(reading, { opacity: 1 });
      setTab("reading", true);

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.6,
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root.current,
          start: "top 85%",
          end: "bottom 10%",
          toggleActions: "play pause play pause",
        },
      });

      tl.to(readingCards, { opacity: 1, y: 0, duration: 0.4, stagger: 0.16 }, 0.15)
        .to(paste, { opacity: 1, y: 0, duration: 0.3 }, "+=0.25")
        .to(pasteUrl, { opacity: 1, duration: 0.25 }, "+=0.15")
        .to(paste, { opacity: 0, y: -6, duration: 0.28 }, "+=0.45")
        .to(pasted, { opacity: 1, y: 0, duration: 0.4 }, "-=0.1")
        .add(() => setTab("music"), "+=0.7")
        .to(reading, { opacity: 0, duration: 0.28 }, "<")
        .to(music, { opacity: 1, duration: 0.28 }, "<")
        .to(musicCards, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12 }, "-=0.05")
        .to({}, { duration: 1.6 })
        .add(() => setTab("reading"))
        .set(readingCards, { opacity: 0, y: 10 }, "<")
        .set(pasted, { opacity: 0, y: 10 }, "<")
        .set(paste, { opacity: 0, y: 6 }, "<")
        .set(pasteUrl, { opacity: 0 }, "<")
        .to(music, { opacity: 0, duration: 0.25 }, "<")
        .to(reading, { opacity: 1, duration: 0.25 }, "<")
        .set(musicCards, { opacity: 0, y: 10 });

      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md" aria-label="A preview of a nook profile">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="size-10 rounded-full bg-surface-hover" aria-hidden />
        <div>
          <p className="text-meta font-semibold leading-tight">Alex Rivera</p>
          <p className="text-caption text-muted">@alex</p>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="relative inline-flex rounded-full border border-border bg-surface p-1" aria-hidden>
          <span data-tab-indicator className="absolute top-1 h-8 rounded-full bg-foreground" />
          <span data-tab="reading" className="relative z-10 flex h-8 items-center rounded-full px-3.5 text-meta font-medium">
            Reading
          </span>
          <span data-tab="music" className="relative z-10 flex h-8 items-center rounded-full px-3.5 text-meta font-medium text-muted">
            Music
          </span>
        </div>
      </div>

      <div className="relative px-5 pb-5 pt-4">
        <div data-shelf="reading">
          <p className="text-caption text-muted">Books</p>
          <h2 className="mt-0.5 text-heading font-semibold">In the collection</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {READING.map((item) => (
              <div key={item.title} data-drop>
                <Card {...item} />
              </div>
            ))}
            <div data-pasted className="min-w-0">
              <Card src={PASTED.src} title={PASTED.title} />
            </div>
          </div>
          <div data-paste className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2.5">
            <Link2 className="size-4 shrink-0 text-muted" aria-hidden strokeWidth={1.8} />
            <span className="text-caption text-muted">Paste a link</span>
            <span data-paste-url className="ml-auto truncate text-caption font-medium text-foreground">
              {PASTED.url}
            </span>
          </div>
        </div>

        <div data-shelf="music" className="absolute inset-0 px-5 pb-5 pt-4">
          <p className="text-caption text-muted">Vinyl</p>
          <h2 className="mt-0.5 text-heading font-semibold">On repeat</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {MUSIC.map((item) => (
              <div key={item.title} data-drop>
                <Card {...item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
