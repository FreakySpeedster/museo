import { route, ok } from "@/lib/api";
import { follow, unfollow } from "@/lib/services/notifications";

/** POST follows (or requests to, when the account approves followers); DELETE unfollows or cancels a request. */
export const POST = route<{ username: string }>(
  async ({ user, params }) => {
    const state = await follow(user.id, params.username);
    return ok({ state, following: state === "following" });
  },
  { auth: true, limit: { key: "follow", max: 60, windowMs: 60_000 } },
);

export const DELETE = route<{ username: string }>(
  async ({ user, params }) => {
    const state = await unfollow(user.id, params.username);
    return ok({ state, following: false });
  },
  { auth: true },
);
