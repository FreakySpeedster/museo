import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { addComment, toggleLike } from "@/lib/services/social";
import { follow, followState, listNotifications, markAllRead, respondToRequest, setFollowPolicy, unfollow, unreadCount } from "@/lib/services/notifications";

async function newUser(name: string) {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  return { u, page };
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("follow requests", () => {
  it("defaults to request; accept creates the follow and notifies both sides", async () => {
    const a = await newUser("ana");
    const b = await newUser("ben");
    expect(await follow(b.u.id, "ana")).toBe("requested");
    expect(await follow(b.u.id, "ana")).toBe("requested"); // idempotent
    expect(await unreadCount(a.u.id)).toBe(1);
    let list = (await listNotifications(a.u.id)).notifications;
    expect(list[0]).toMatchObject({ type: "FOLLOW_REQUEST", pending: true });

    await respondToRequest(a.u.id, "ben", true);
    expect(await followState(b.u.id, a.u.id)).toBe("following");
    list = (await listNotifications(a.u.id)).notifications;
    expect(list[0].type).toBe("FOLLOW");
    expect((await listNotifications(b.u.id)).notifications[0].type).toBe("FOLLOW_ACCEPTED");
    await expect(respondToRequest(a.u.id, "ben", true)).rejects.toBeInstanceOf(AppError);
  });

  it("reject and cancel remove the request and its notification", async () => {
    const a = await newUser("cat");
    const b = await newUser("dan");
    await follow(b.u.id, "cat");
    await respondToRequest(a.u.id, "dan", false);
    expect(await followState(b.u.id, a.u.id)).toBe("none");
    expect(await unreadCount(a.u.id)).toBe(0);
    await follow(b.u.id, "cat");
    await unfollow(b.u.id, "cat");
    expect(await db.followRequest.count()).toBe(0);
    expect(await unreadCount(a.u.id)).toBe(0);
  });

  it("open accounts follow instantly; switching to open approves pending requests", async () => {
    const a = await newUser("eve");
    const b = await newUser("fay");
    const c = await newUser("gus");
    await follow(b.u.id, "eve");
    await setFollowPolicy(a.u.id, "open");
    expect(await followState(b.u.id, a.u.id)).toBe("following");
    expect(await follow(c.u.id, "eve")).toBe("following");
  });
});

describe("activity notifications", () => {
  it("likes and comments notify the owner, unlike retracts, self-activity is silent, read clears the badge", async () => {
    const a = await newUser("hal");
    const b = await newUser("ivy");
    await setFollowPolicy(a.u.id, "open");
    await follow(b.u.id, "hal");
    const shelf = await createShelf(a.u.id, a.page.id, { name: "S", category: "books" });
    const item = await db.item.create({ data: { shelfId: shelf.id, userId: a.u.id, type: "PHOTO", title: "Dune", position: 0 } });
    await markAllRead(a.u.id);

    await toggleLike(b.u.id, item.id);
    expect(await unreadCount(a.u.id)).toBe(1);
    await toggleLike(b.u.id, item.id);
    expect(await unreadCount(a.u.id)).toBe(0);

    await toggleLike(a.u.id, item.id); // own like
    const c = await addComment(b.u.id, item.id, "Great pick");
    await addComment(a.u.id, item.id, "Thanks!", c.id); // owner replies -> commenter gets REPLY
    const mine = (await listNotifications(a.u.id)).notifications;
    expect(mine.map((n) => n.type)).toEqual(["COMMENT", "FOLLOW"]);
    expect(mine[0]).toMatchObject({ excerpt: "Great pick", item: { id: item.id } });
    expect((await listNotifications(b.u.id)).notifications[0].type).toBe("REPLY");

    await markAllRead(a.u.id);
    expect(await unreadCount(a.u.id)).toBe(0);
  });
});
