import bcrypt from "bcryptjs";
import { db } from "../db";
import { AppError } from "../errors";
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
        data: { userId: user.id, title: "My Collections", emoji: "📚", description: "", position: 0 },
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
