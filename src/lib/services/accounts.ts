import bcrypt from "bcryptjs";
import { db } from "../db";
import { AppError } from "../errors";
import { deleteUploadByUrl, saveAvatar } from "../uploads";
import { loginSchema, signupSchema } from "../validation";
import type { z } from "zod";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 11);

export async function createUser(input: z.infer<typeof signupSchema>) {
  const [emailTaken, nameTaken] = await Promise.all([
    db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    db.user.findUnique({ where: { username: input.username }, select: { id: true } }),
  ]);
  if (emailTaken) throw new AppError("CONFLICT", "An account with that email already exists");
  if (nameTaken) throw new AppError("CONFLICT", "That username is taken");
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          displayName: input.displayName || input.username,
          passwordHash,
        },
      });
      // Every new account starts with its (free) first page.
      await tx.page.create({
        data: { userId: user.id, title: "My Collections", description: "", position: 0 },
      });
      return user;
    });
  } catch {
    throw new AppError("CONFLICT", "That email or username is already taken");
  }
}

export async function authenticate(input: z.infer<typeof loginSchema>) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("UNAUTHORIZED", "Incorrect email or password");
  return user;
}

/** Replace the user's avatar (stored via the storage adapter) and clean up the previous file. */
export async function setAvatar(userId: string, file: Buffer) {
  const url = await saveAvatar(file);
  try {
    const prev = await db.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    const user = await db.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    await deleteUploadByUrl(prev?.avatarUrl);
    return user;
  } catch (e) {
    await deleteUploadByUrl(url);
    throw e;
  }
}

export async function removeAvatar(userId: string) {
  const prev = await db.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const user = await db.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  await deleteUploadByUrl(prev?.avatarUrl);
  return user;
}
