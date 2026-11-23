import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const next = safeNext(sp.next);
  if (user) redirect(next ?? `/u/${user.username}`);
  return <AuthForm mode="signup" next={next} />;
}
