import { Link2, ImageIcon, Share2 } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductDemo } from "./ProductDemo";
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
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="fade-up text-balance text-display font-semibold tracking-tight">Show off what you collect.</h1>
          <p className="fade-up fade-up-d1 mx-auto mt-5 max-w-xl text-pretty text-lede text-muted">
            Build a page, add shelves, and drop in links or photos. nook pulls the image for you.
          </p>
          <div className="fade-up fade-up-d2 mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" size="lg">
              Start for free
            </LinkButton>
            <LinkButton href="/pricing" variant="secondary" size="lg">
              See pricing
            </LinkButton>
          </div>
        </div>
        <div className="fade-up fade-up-d3 mx-auto mt-16 max-w-3xl sm:mt-20">
          <ProductDemo />
        </div>
      </section>

      <CategoryMarquee />

      <PageShowcase />

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
