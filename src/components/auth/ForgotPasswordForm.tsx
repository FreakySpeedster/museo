"use client";

import Link from "next/link";
import { KeyRound, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/client";
import { Button } from "../ui/Button";
import { Field, FormError, Input } from "../ui/Field";
import { AuthCard } from "./AuthCard";

const backLink = "font-medium text-foreground underline decoration-accent decoration-2 underline-offset-4";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ email: string; message: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email") || "");
    try {
      const { message } = await api<{ message: string }>("/api/auth/forgot-password", { json: { email } });
      setSent({ email, message });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthCard icon={<MailCheck className="size-5" aria-hidden />} title="Check your email" description={sent.message}>
        <p className="mt-4 text-meta text-muted">
          Sent to <span className="font-medium text-foreground">{sent.email}</span>. Nothing there after a few minutes? Check spam, or try again.
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => setSent(null)}>
          Use a different email
        </Button>
        <p className="mt-6 text-center text-meta text-muted">
          <Link href="/login" className={backLink}>Back to log in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={<KeyRound className="size-5" aria-hidden />} title="Forgot your password?" description="Enter the email you signed up with and we'll send you a link to choose a new one.">
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus placeholder="you@example.com" />
        </Field>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-meta text-muted">
        Remembered it? <Link href="/login" className={backLink}>Log in</Link>
      </p>
    </AuthCard>
  );
}
