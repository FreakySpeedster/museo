import type { ReactNode } from "react";
import { ArrowRight, Heart, ImageIcon, Link2, MessageCircle, Share2, Sparkles, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryMarquee } from "./CategoryMarquee";
import { PageShowcase } from "./PageShowcase";

const STEPS = [
  { icon: Link2, title: "Create a page", body: "Start with one page. Add more when your collections grow." },
  { icon: ImageIcon, title: "Stock your shelves", body: "Drop in a link or a photo. nook finds the image for you." },
  { icon: Share2, title: "Share your profile", body: "Send one link. Friends can browse every shelf you choose to show." },
] as const;

export function Landing() {
  return (
    <div>
      <section className="landing-hero relative overflow-hidden">
        <div className="landing-dots pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">
          <div className="fade-up mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-caption text-muted backdrop-blur">
            <Sparkles className="size-3.5 text-accent" aria-hidden /> New: tags, replies and reactions
          </div>
          <h1 className="fade-up mx-auto mt-8 max-w-4xl text-balance text-display font-semibold leading-[1.02] tracking-tight">
            Collect what you love.
            <span className="block text-muted">Show it off beautifully.</span>
          </h1>
          <p className="fade-up fade-up-d1 mx-auto mt-6 max-w-xl text-pretty text-lede text-muted">
            Pages and shelves for the things you collect, built from a link or a photo. nook pulls the images, you pick the story.
          </p>
          <div className="fade-up fade-up-d2 mt-9 flex justify-center">
            <LinkButton href="/signup" size="lg" className="rounded-full px-7">
              Start your nook, free <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          </div>
          <p className="fade-up fade-up-d2 mt-4 text-meta text-muted">One page free forever. No card needed.</p>

          <div className="fade-up fade-up-d3 relative mx-auto mt-14 max-w-5xl text-left sm:mt-20">
            <PageShowcase variant="framed" />
            <FloatCard className="-left-10 top-24 rotate-[-3deg]" icon={<Heart className="size-4 text-[#FF4D6D]" aria-hidden fill="currentColor" />} title="meera liked your shelf" body="Vinyl I keep coming back to" />
            <FloatCard className="-right-10 top-10 rotate-[3deg]" icon={<MessageCircle className="size-4 text-accent" aria-hidden />} title="kabir commented" body="Where did you find this pair?" />
            <FloatCard className="-right-6 bottom-10 rotate-[-2deg]" icon={<Users className="size-4 text-accent" aria-hidden />} title="12 new followers" body="Your Watches page is getting noticed" />
          </div>
        </div>
      </section>

      <CategoryMarquee />

      <section className="border-t-0">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-3 md:gap-10 lg:py-28">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="grid size-10 place-items-center rounded-lg border border-border bg-surface text-foreground">
                <Icon className="size-5" aria-hidden strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-heading font-semibold">{title}</h2>
              <p className="mt-2 text-body text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <h2 className="text-title font-semibold tracking-tight">One page is free. Add more with Plus.</h2>
          <p className="mx-auto mt-3 max-w-lg text-lede text-muted">Unlimited shelves, links, and photos on every plan. Upgrade only when you need another page.</p>
          <div className="mt-8">
            <LinkButton href="/pricing" variant="secondary" size="lg" className="btn-shimmer">
              Compare plans
            </LinkButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FloatCard({ className, icon, title, body }: { className: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className={`landing-float absolute hidden w-60 rounded-2xl border border-border bg-surface-raised/90 p-3.5 shadow-lg backdrop-blur-md lg:block ${className}`} aria-hidden>
      <div className="flex items-center gap-2 text-caption text-muted">{icon}<span className="truncate">{title}</span></div>
      <p className="mt-1.5 text-meta font-medium">{body}</p>
    </div>
  );
}
