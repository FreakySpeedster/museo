import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import { appUrl } from "./env";
import { AppError } from "./errors";
import { applyStripeSubscription } from "./services/billing";

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError("BAD_REQUEST", "Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function createCheckoutUrl(user: { id: string; email: string; stripeCustomerId: string | null }) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    client_reference_id: user.id,
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/pricing?canceled=1`,
  });
  if (!session.url) throw new AppError("BAD_REQUEST", "Could not start checkout");
  return session.url;
}

export async function createPortalUrl(customerId: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/pricing`,
  });
  return session.url;
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/** Apply a verified Stripe webhook event to our database. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== "subscription") return;
      const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
      await applyStripeSubscription({
        userId: s.client_reference_id,
        customerId: idOf(s.customer as string | { id: string } | null),
        subscriptionId: idOf(s.subscription as string | { id: string } | null),
        status: paid ? "active" : "incomplete",
      });
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await applyStripeSubscription({
        userId: sub.metadata?.userId,
        customerId: idOf(sub.customer as string | { id: string }),
        subscriptionId: sub.id,
        status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
      });
      return;
    }
    default:
      return;
  }
}

export async function userByCustomer(customerId: string) {
  return db.user.findUnique({ where: { stripeCustomerId: customerId } });
}
