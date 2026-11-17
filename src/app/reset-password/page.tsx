import type { Metadata } from "next";
import { ExpiredResetLink, ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { resetTokenIsValid } from "@/lib/services/passwords";

// The token lives in the URL: never leak it to other sites or caches.
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  if (!(await resetTokenIsValid(token))) return <ExpiredResetLink />;
  return <ResetPasswordForm token={token} />;
}
