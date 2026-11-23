import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const next = safeNext(sp.next);
  if (user) redirect(next ?? `/u/${user.username}`);
  const demo = await db.user.findUnique({ where: { email: "demo@shelfie.app" }, select: { id: true } });
  return <AuthForm mode="login" next={next} demoHint={Boolean(demo) && process.env.VERCEL_ENV !== "production"} />;
}
