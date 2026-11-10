import { beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { createUser } from "@/lib/services/accounts";
import { createPage } from "@/lib/services/pages";
import { handleStripeEvent } from "@/lib/stripe";

const ev = (type: string, object: unknown) => ({ type, data: { object } }) as unknown as Stripe.Event;

beforeEach(async () => {
  await db.user.deleteMany();
});

describe("Stripe webhook handling", () => {
  it("checkout.session.completed activates the user; subscription.deleted revokes", async () => {
    const u = await createUser({ email: "s@test.dev", username: "stripey", password: "password123" } as never);
    await handleStripeEvent(
      ev("checkout.session.completed", { mode: "subscription", payment_status: "paid", client_reference_id: u.id, customer: "cus_123", subscription: "sub_123" }),
    );
    let fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(fresh).toMatchObject({ subscribed: true, subscriptionStatus: "active", stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123" });
    await expect(createPage(u.id, { title: "Two", description: "" })).resolves.toBeTruthy();

    await handleStripeEvent(ev("customer.subscription.updated", { id: "sub_123", customer: "cus_123", status: "past_due", metadata: { userId: u.id } }));
    fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(fresh.subscribed).toBe(false);

    await handleStripeEvent(ev("customer.subscription.updated", { id: "sub_123", customer: "cus_123", status: "active", metadata: {} }));
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).subscribed).toBe(true);

    await handleStripeEvent(ev("customer.subscription.deleted", { id: "sub_123", customer: "cus_123", status: "canceled", metadata: {} }));
    fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(fresh).toMatchObject({ subscribed: false, subscriptionStatus: "canceled" });
  });

  it("ignores unpaid checkouts, unknown customers and unrelated events", async () => {
    const u = await createUser({ email: "s2@test.dev", username: "stripey2", password: "password123" } as never);
    await handleStripeEvent(ev("checkout.session.completed", { mode: "subscription", payment_status: "unpaid", client_reference_id: u.id, customer: "cus_9", subscription: "sub_9" }));
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).subscribed).toBe(false);
    await expect(handleStripeEvent(ev("customer.subscription.deleted", { id: "x", customer: "cus_unknown", status: "canceled", metadata: {} }))).resolves.toBeUndefined();
    await expect(handleStripeEvent(ev("invoice.paid", {}))).resolves.toBeUndefined();
  });
});
