import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryMarquee } from "./CategoryMarquee";
import { Hero } from "./Hero";
import { PageShowcase } from "./PageShowcase";
import { Story } from "./Story";

export function Landing() {
  return (
    <div>
      <Hero />
      <CategoryMarquee />
      <PageShowcase />
      <Story />

      <section className="landing-cta relative overflow-hidden border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="text-micro font-medium uppercase tracking-[0.2em] text-muted">Free to start</p>
          <Link href="/signup" className="group mt-4 flex items-end justify-between gap-6 border-b border-border pb-6">
            <span className="cta-mega font-semibold">Start your nook.</span>
            <span className="mb-2 grid size-14 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-500 group-hover:-rotate-45 sm:size-20">
              <ArrowRight className="size-6 sm:size-8" aria-hidden />
            </span>
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-meta text-muted">
            <p>One page and up to 10 items per collection, free forever. Plus unlocks unlimited pages and items, and your own blog.</p>
            <Link href="/pricing" className="font-medium text-foreground underline-offset-4 hover:underline">Compare plans</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
