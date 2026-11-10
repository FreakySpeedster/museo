import { route, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { stripeConfigured } from "@/lib/env";
import { activateDemoSubscription, cancelDemoSubscription } from "@/lib/services/billing";
import { toViewerDTO } from "@/lib/mappers";

/** Demo mode only: available when Stripe env vars are NOT configured. */
function assertDemo() {
  if (stripeConfigured()) throw new AppError("FORBIDDEN", "Demo upgrades are disabled when Stripe is configured");
}

export const POST = route(
  async ({ user }) => {
    assertDemo();
    return ok({ user: toViewerDTO(await activateDemoSubscription(user.id)) });
  },
  { auth: true },
);

export const DELETE = route(
  async ({ user }) => {
    assertDemo();
    return ok({ user: toViewerDTO(await cancelDemoSubscription(user.id)) });
  },
  { auth: true },
);
