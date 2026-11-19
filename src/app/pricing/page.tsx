import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { PricingActions } from "@/components/PricingActions";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyUpgrade } from "@/components/StickyUpgrade";
import { FREE_ITEMS_PER_SHELF, MAX_SHELVES_PER_PAGE } from "@/lib/limits";

export const metadata: Metadata = { title: "Pricing" };

const Tick = ({ children }: { children: ReactNode }) => (
  <li className="flex items-center gap-2.5"><Check className="size-4 shrink-0 text-accent" aria-hidden strokeWidth={2.6} />{children}</li>
);

const YourPlan = () => (
  <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-success" data-testid="your-plan">
    <Check className="size-3" aria-hidden strokeWidth={3} /> Your plan
  </span>
);

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const stripe = stripeConfigured();
  const price = process.env.PLUS_PRICE_LABEL || "$4 / month";
  return (
    <div>
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-24">
      <div className="text-center">
        <h1 className="text-balance text-title font-semibold tracking-tight">Simple, honest pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-lede text-muted">Start free with one page and up to {FREE_ITEMS_PER_SHELF} items per collection. Upgrade when your collections outgrow it.</p>
        {sp.canceled && <p className="mx-auto mt-4 w-fit rounded-full bg-warning-subtle px-4 py-1.5 text-meta text-warning">Checkout canceled — no charge was made.</p>}
      </div>
      <div className="mt-8 grid gap-4 sm:mt-12 md:grid-cols-2 md:gap-5">
        <div className="relative order-2 rounded-3xl border border-border bg-surface p-6 sm:p-8 md:order-1">
          {user && !user.subscribed && <YourPlan />}
          <p className="text-meta font-medium text-muted">Free</p>
          <p className="mt-1 text-title font-semibold tracking-tight">$0</p>
          <ul className="my-6 space-y-2.5 text-body"><Tick>1 page</Tick><Tick>Up to {MAX_SHELVES_PER_PAGE} collections per page</Tick><Tick>Up to {FREE_ITEMS_PER_SHELF} items per collection</Tick><Tick>Likes, comments &amp; followers</Tick><Tick>Public profile</Tick></ul>
          <p className="text-meta text-muted">{user ? (user.subscribed ? "Included with Plus" : "Your current plan") : "Always free"}</p>
        </div>
        <div className="relative order-1 rounded-3xl border border-border bg-surface p-6 ring-1 ring-accent/30 sm:p-8 md:order-2">
          {user?.subscribed ? <YourPlan /> : <span className="absolute right-6 top-6 rounded-full bg-accent-subtle px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-accent">Plus</span>}
          <p className="text-meta font-medium text-muted">Museo Plus</p>
          <p className="mt-1 text-title font-semibold tracking-tight">{price}</p>
          <ul className="my-6 space-y-2.5 text-body"><Tick>Everything in Free</Tick><Tick><strong>Unlimited pages</strong></Tick><Tick><strong>Unlimited items</strong> per collection</Tick><Tick>Your Museo blog, with tagged items</Tick><Tick>Move collections between pages</Tick><Tick>Cancel anytime</Tick></ul>
          <div id="plus-cta">
          <PricingActions signedIn={Boolean(user)} subscribed={Boolean(user?.subscribed)} stripeEnabled={stripe} status={user?.subscriptionStatus ?? "none"} hasCustomer={Boolean(user?.stripeCustomerId)} />
          </div>
          {!stripe && (
            <p className="mt-4 rounded-md border border-dashed border-warning/40 bg-warning-subtle px-3 py-2 text-caption text-warning">
              <strong>Demo mode:</strong> Stripe keys aren’t configured, so upgrading just marks your account as subscribed. No payment is taken.
            </p>
          )}
        </div>
      </div>
    </div>
    {!user?.subscribed && <StickyUpgrade targetId="plus-cta" price={price} />}
    <SiteFooter />
    </div>
  );
}
