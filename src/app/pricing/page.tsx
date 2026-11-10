import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { PricingActions } from "@/components/PricingActions";

export const metadata: Metadata = { title: "Pricing" };

const Tick = ({ children }: { children: ReactNode }) => (
  <li className="flex items-center gap-2.5"><Check className="size-4 shrink-0 text-accent" aria-hidden strokeWidth={2.6} />{children}</li>
);

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const stripe = stripeConfigured();
  const price = process.env.PLUS_PRICE_LABEL || "$4 / month";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-14 sm:px-6">
      <div className="text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Simple pricing for serious collectors</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">Start free with one page. Upgrade when your collections outgrow it.</p>
        {sp.canceled && <p className="mx-auto mt-4 w-fit rounded-full bg-amber-500/15 px-4 py-1.5 text-sm text-amber-800 dark:text-amber-300">Checkout canceled — no charge was made.</p>}
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-8">
          <p className="text-sm font-medium text-muted">Free</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">$0</p>
          <ul className="my-6 space-y-2.5 text-[15px]"><Tick>1 page</Tick><Tick>Up to 5 shelves per page</Tick><Tick>Unlimited links &amp; photos</Tick><Tick>Public profile &amp; timeline</Tick></ul>
          <p className="text-sm text-muted">{user ? (user.subscribed ? "Included with Plus" : "Your current plan") : "Always free"}</p>
        </div>
        <div className="relative rounded-3xl border-2 border-accent bg-surface p-8 shadow-[0_24px_70px_-24px_var(--accent)]">
          <span className="absolute right-6 top-6 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase text-accent-ink">Most popular</span>
          <p className="text-sm font-medium text-muted">Shelfie Plus</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{price}</p>
          <ul className="my-6 space-y-2.5 text-[15px]"><Tick>Everything in Free</Tick><Tick><strong>Unlimited pages</strong></Tick><Tick>Instant page switcher</Tick><Tick>Cancel anytime</Tick></ul>
          <PricingActions signedIn={Boolean(user)} subscribed={Boolean(user?.subscribed)} stripeEnabled={stripe} status={user?.subscriptionStatus ?? "none"} hasCustomer={Boolean(user?.stripeCustomerId)} />
          {!stripe && (
            <p className="mt-4 rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <strong>Demo mode:</strong> Stripe keys aren’t configured, so upgrading just marks your account as subscribed. No payment is taken.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
