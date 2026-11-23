import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CompactIdentity } from "@/components/profile/CompactIdentity";
import { PlusMark } from "@/components/ui/PlusMark";
import { UserName } from "@/components/ui/UserName";
import { db } from "@/lib/db";
import { publicUserPreviewSelect, publicUserSelect, toPublicUser } from "@/lib/mappers";
import { createUser } from "@/lib/services/accounts";
import { activateDemoSubscription } from "@/lib/services/billing";
import { getProfile } from "@/lib/services/profile";
import { searchPage } from "@/lib/services/search";

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("toPublicUser", () => {
  it("includes subscribed and omits billing and email fields", () => {
    const plus = toPublicUser({
      id: "u1",
      username: "mei",
      displayName: "Mei Chen",
      bio: "cameras",
      avatarUrl: null,
      subscribed: true,
    });
    expect(plus.subscribed).toBe(true);
    expect(plus).not.toHaveProperty("email");
    expect(plus).not.toHaveProperty("subscriptionStatus");
    expect(plus).not.toHaveProperty("stripeCustomerId");
    expect(plus).not.toHaveProperty("stripeSubscriptionId");
    expect(toPublicUser({ id: "u1", username: "mei", displayName: "Mei Chen", bio: "cameras", avatarUrl: null, subscribed: false }).subscribed).toBe(false);
  });

  it("keeps billing fields out of the shared public select", () => {
    expect(publicUserSelect).toMatchObject({ id: true, username: true, displayName: true, subscribed: true });
    expect(publicUserSelect).not.toHaveProperty("email");
    expect(publicUserSelect).not.toHaveProperty("subscriptionStatus");
    expect(publicUserSelect).not.toHaveProperty("stripeCustomerId");
    expect(publicUserPreviewSelect).toMatchObject({ subscribed: true });
    expect(publicUserPreviewSelect).not.toHaveProperty("email");
  });
});

describe("profile and search expose Plus as a public flag", () => {
  it("returns subscribed on the profile and on person search hits", async () => {
    const u = await createUser({ email: "mei@test.dev", username: "mei", password: "password123", displayName: "Mei Chen" } as never);
    const profile = await getProfile("mei");
    expect(profile?.user.subscribed).toBe(false);
    expect(profile?.user).not.toHaveProperty("email");
    expect(profile?.user).not.toHaveProperty("stripeCustomerId");

    await activateDemoSubscription(u.id);
    const plus = await getProfile("mei");
    expect(plus?.user.subscribed).toBe(true);
    expect(plus?.user.displayName).toBe("Mei Chen");

    const hits = await searchPage("Mei", "people", "relevance");
    const me = hits.items.find((h) => h.kind === "person" && h.id === u.id);
    expect(me?.subscribed).toBe(true);
  });
});

describe("Plus mark markup", () => {
  it("labels the Plus sparkle for assistive tech", () => {
    const html = renderToStaticMarkup(createElement(PlusMark));
    expect(html).toContain("Museo Plus member");
    expect(html).toContain("data-testid=\"plus-mark\"");
    expect(html).toContain("viewBox=\"0 0 32 32\"");
    expect(html).toContain("text-plus");
    expect(html).not.toContain("text-accent");
  });

  it("renders the mark beside a Plus member's name and hides it for free accounts", () => {
    const plus = renderToStaticMarkup(
      createElement(UserName, { user: { username: "mei", displayName: "Mei Chen", subscribed: true } }),
    );
    expect(plus).toContain("Mei Chen");
    expect(plus).toContain("Museo Plus member");
    expect(plus).toContain("/u/mei");

    const free = renderToStaticMarkup(
      createElement(UserName, { user: { username: "roh", displayName: "Rohan", subscribed: false } }),
    );
    expect(free).toContain("Rohan");
    expect(free).not.toContain("Museo Plus member");
  });

  it("shows the mark in the compact profile identity when the user is on Plus", () => {
    const shown = renderToStaticMarkup(
      createElement(CompactIdentity, {
        visible: true,
        displayName: "Mei Chen",
        username: "mei",
        avatarUrl: null,
        subscribed: true,
      }),
    );
    expect(shown).toContain("Mei Chen");
    expect(shown).toContain("@mei");
    expect(shown).toContain("Museo Plus member");

    const hidden = renderToStaticMarkup(
      createElement(CompactIdentity, {
        visible: true,
        displayName: "Ada Lovelace",
        username: "ada",
        avatarUrl: null,
        subscribed: false,
      }),
    );
    expect(hidden).not.toContain("Museo Plus member");
  });
});
