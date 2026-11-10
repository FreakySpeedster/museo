import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { stripeConfigured } from "@/lib/env";
import { createPortalUrl } from "@/lib/stripe";

export const POST = route(
  async ({ user }) => {
    if (!stripeConfigured() || !user.stripeCustomerId) throw new AppError("BAD_REQUEST", "No billing account to manage");
    return ok({ url: await createPortalUrl(user.stripeCustomerId) });
  },
  { auth: true },
);
