import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "../db";
import { AppError } from "../errors";
import { hashPassword } from "./accounts";
import { passwordResetEmail, sendMail, type Mail } from "../mailer";

export const RESET_TTL_MS = 60 * 60_000;
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Create a fresh single-use token for the user; any older unused links stop working. Returns the raw token. */
export async function issueResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  // Opportunistic cleanup of long-dead rows (no cron needed).
  if (Math.random() < 0.05) {
    void db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 3600_000) } } }).catch(() => {});
  }
  return token;
}

/**
 * Start a reset for an email. Does nothing visible for unknown emails, so callers can always answer
 * with the same generic message (no account enumeration).
 */
export async function requestPasswordReset(email: string, baseUrl: string, send: (m: Mail) => Promise<unknown> = sendMail): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true, username: true } });
  if (!user) return;
  const token = await issueResetToken(user.id);
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await send(passwordResetEmail(user.email, user.displayName || user.username, link));
}

async function findUsable(token: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

export async function resetTokenIsValid(token: string): Promise<boolean> {
  if (!token || token.length < 20 || token.length > 200) return false;
  return Boolean(await findUsable(token));
}

const INVALID_LINK = "This reset link has expired or was already used. Request a new one.";

/** Consume a token and set the new password. Signs the user out everywhere. Returns the user. */
export async function resetPassword(token: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  return db.$transaction(async (tx) => {
    // Atomic claim: only one concurrent request can flip usedAt.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new AppError("BAD_REQUEST", INVALID_LINK, { reason: "INVALID_TOKEN" });
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    const user = await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    return user;
  });
}

/** Change password while signed in. Keeps the given session (this device), signs out every other one. */
export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionHash: string | null) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError("BAD_REQUEST", "Your current password is incorrect");
  }
  if (currentPassword === newPassword) throw new AppError("BAD_REQUEST", "Your new password must be different from your current one");
  const passwordHash = await hashPassword(newPassword);
  const [, revoked] = await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId, ...(keepSessionHash ? { tokenHash: { not: keepSessionHash } } : {}) } }),
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
  ]);
  return { signedOutOthers: revoked.count };
}
