import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createUser } from "@/lib/services/accounts";
import { createShelf } from "@/lib/services/shelves";
import { createPhotoItem } from "@/lib/services/items";
import { addComment, canCommentOnItem, deleteComment, toggleLike } from "@/lib/services/social";
import sharp from "sharp";

const PNG = () => sharp({ create: { width: 40, height: 30, channels: 3, background: "#abc" } }).png().toBuffer();

async function newUser(name: string) {
  const u = await createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
  const page = await db.page.findFirstOrThrow({ where: { userId: u.id } });
  return { u, page };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e) => e instanceof AppError && e.code === code);
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

async function setup() {
  const owner = await newUser("owner");
  const fan = await newUser("fanclub");
  const stranger = await newUser("stranger");
  const shelf = await createShelf(owner.u.id, owner.page.id, { name: "Reads", category: "books" });
  const item = await createPhotoItem(owner.u.id, shelf.id, { title: "Dune", description: "A favorite." }, await PNG());
  return { owner, fan, stranger, item };
}

describe("comment permissions", () => {
  it("lets the owner comment on their own item", async () => {
    const { owner, item } = await setup();
    expect(await canCommentOnItem(owner.u.id, owner.u.id)).toBe(true);
    const c = await addComment(owner.u.id, item.id, "My own thoughts.");
    expect(c.body).toBe("My own thoughts.");
    expect(c.user.id).toBe(owner.u.id);
  });

  it("lets a follower comment, but not a stranger", async () => {
    const { owner, fan, stranger, item } = await setup();
    await db.follow.create({ data: { followerId: fan.u.id, followingId: owner.u.id } });
    expect(await canCommentOnItem(fan.u.id, owner.u.id)).toBe(true);
    expect(await canCommentOnItem(stranger.u.id, owner.u.id)).toBe(false);
    const c = await addComment(fan.u.id, item.id, "Love this.");
    expect(c.body).toBe("Love this.");
    await expectCode(addComment(stranger.u.id, item.id, "Nope"), "FORBIDDEN");
    expect(await db.itemComment.count({ where: { itemId: item.id } })).toBe(1);
  });

  it("lets an author delete their own comment but not someone else's", async () => {
    const { owner, fan, item } = await setup();
    await db.follow.create({ data: { followerId: fan.u.id, followingId: owner.u.id } });
    const mine = await addComment(fan.u.id, item.id, "Mine");
    const theirs = await addComment(owner.u.id, item.id, "Owner note");
    await deleteComment(fan.u.id, mine.id);
    expect(await db.itemComment.findUnique({ where: { id: mine.id } })).toBeNull();
    await expectCode(deleteComment(fan.u.id, theirs.id), "FORBIDDEN");
    expect(await db.itemComment.findUnique({ where: { id: theirs.id } })).not.toBeNull();
  });
});

describe("likes", () => {
  it("lets any signed-in user like and unlike, including a stranger", async () => {
    const { stranger, item } = await setup();
    const on = await toggleLike(stranger.u.id, item.id);
    expect(on.likedByMe).toBe(true);
    expect(on.likeCount).toBe(1);
    const off = await toggleLike(stranger.u.id, item.id);
    expect(off.likedByMe).toBe(false);
    expect(off.likeCount).toBe(0);
  });
});
