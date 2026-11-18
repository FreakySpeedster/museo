import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/u/${user.username}`);
  const demo = await db.user.findUnique({ where: { email: "demo@shelfie.app" }, select: { id: true } });
  return <AuthForm mode="login" demoHint={Boolean(demo) && process.env.VERCEL_ENV !== "production"} />;
}
