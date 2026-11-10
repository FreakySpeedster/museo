import { db } from "../db";
import { AppError } from "../errors";

/** Statuses that grant Plus access. */
const ACTIVE = new Set(["active", "trialing", "demo"]);

export async function activateDemoSubscription(userId: string) {
  return db.user.update({ where: { id: userId }, data: { subscribed: true, subscriptionStatus: "demo" } });
}

export async function cancelDemoSubscription(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND", "User not found");
  if (user.subscriptionStatus !== "demo") throw new AppError("BAD_REQUEST", "No demo subscription to cancel");
  return db.user.update({ where: { id: userId }, data: { subscribed: false, subscriptionStatus: "canceled" } });
}

export async function applyStripeSubscription(opts: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  status: string;
}) {
  const where = opts.userId ? { id: opts.userId } : opts.customerId ? { stripeCustomerId: opts.customerId } : null;
  if (!where) return null;
  const user = await db.user.findFirst({ where });
  if (!user) return null;
  return db.user.update({
    where: { id: user.id },
    data: {
      subscribed: ACTIVE.has(opts.status),
      subscriptionStatus: opts.status,
      ...(opts.customerId ? { stripeCustomerId: opts.customerId } : {}),
      ...(opts.subscriptionId ? { stripeSubscriptionId: opts.subscriptionId } : {}),
    },
  });
}
