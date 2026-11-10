import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { stripeConfigured } from "@/lib/env";
import { createCheckoutUrl } from "@/lib/stripe";

export const POST = route(
  async ({ user }) => {
    if (!stripeConfigured()) throw new AppError("BAD_REQUEST", "Stripe isn't configured. Use the demo upgrade instead.");
    if (user.subscribed) throw new AppError("CONFLICT", "You're already subscribed");
    return ok({ url: await createCheckoutUrl(user) });
  },
  { auth: true, limit: { key: "checkout", max: 10, windowMs: 60_000 } },
);
