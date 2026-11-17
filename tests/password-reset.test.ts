import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Mail } from "@/lib/mailer";
import { authenticate, createUser } from "@/lib/services/accounts";
import { changePassword, issueResetToken, requestPasswordReset, resetPassword, resetTokenIsValid } from "@/lib/services/passwords";

const newUser = (name: string) => createUser({ email: `${name}@test.dev`, username: name, password: "password123" } as never);
const session = (userId: string, tokenHash: string) => db.session.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 86400_000) } });

function capture() {
  const sent: Mail[] = [];
  return { sent, send: async (m: Mail) => void sent.push(m), token: () => new URL(sent.at(-1)!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")! };
}

beforeAll(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.user.deleteMany();
});

describe("password reset", () => {
  it("emails a link, stores only the hash, and is silent for unknown emails", async () => {
    const u = await newUser("rina");
    const mail = capture();
    await requestPasswordReset("nobody@test.dev", "https://nook.test", mail.send);
    expect(mail.sent).toHaveLength(0);
    await requestPasswordReset("rina@test.dev", "https://nook.test", mail.send);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("rina@test.dev");
    expect(mail.sent[0].html).toContain("https://nook.test/reset-password?token=");
    const token = mail.token();
    const rows = await db.passwordResetToken.findMany({ where: { userId: u.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(token);
    expect(rows[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60_000);
    expect(await resetTokenIsValid(token)).toBe(true);
  });

  it("is single use, revokes every session, and the new password works", async () => {
    const u = await newUser("omar");
    await session(u.id, "s1");
    await session(u.id, "s2");
    const token = await issueResetToken(u.id);
    await resetPassword(token, "brand-new-pass");
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect(await resetTokenIsValid(token)).toBe(false);
    await expect(resetPassword(token, "another-pass")).rejects.toBeInstanceOf(AppError);
    await expect(authenticate({ email: "omar@test.dev", password: "password123" })).rejects.toBeInstanceOf(AppError);
    expect((await authenticate({ email: "omar@test.dev", password: "brand-new-pass" })).id).toBe(u.id);
  });

  it("rejects expired and superseded tokens", async () => {
    const u = await newUser("lena");
    const old = await issueResetToken(u.id);
    const fresh = await issueResetToken(u.id);
    expect(await resetTokenIsValid(old)).toBe(false);
    await expect(resetPassword(old, "brand-new-pass")).rejects.toBeInstanceOf(AppError);
    await db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await resetTokenIsValid(fresh)).toBe(false);
    await expect(resetPassword(fresh, "brand-new-pass")).rejects.toBeInstanceOf(AppError);
    expect(await bcrypt.compare("password123", (await db.user.findUniqueOrThrow({ where: { id: u.id } })).passwordHash)).toBe(true);
  });

  it("rejects garbage tokens", async () => {
    expect(await resetTokenIsValid("")).toBe(false);
    expect(await resetTokenIsValid("x".repeat(43))).toBe(false);
  });
});

describe("change password", () => {
  it("requires the current password and keeps only this session", async () => {
    const u = await newUser("ivo");
    await session(u.id, "here");
    await session(u.id, "elsewhere");
    const pending = await issueResetToken(u.id);
    await expect(changePassword(u.id, "wrong-pass", "brand-new-pass", "here")).rejects.toThrow(/current password/);
    await expect(changePassword(u.id, "password123", "password123", "here")).rejects.toBeInstanceOf(AppError);
    const res = await changePassword(u.id, "password123", "brand-new-pass", "here");
    expect(res.signedOutOthers).toBe(1);
    expect((await db.session.findMany({ where: { userId: u.id } })).map((s) => s.tokenHash)).toEqual(["here"]);
    expect(await resetTokenIsValid(pending)).toBe(false);
    expect((await authenticate({ email: "ivo@test.dev", password: "brand-new-pass" })).id).toBe(u.id);
  });
});
