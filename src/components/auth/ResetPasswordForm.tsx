"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/client";
import { Button, LinkButton } from "../ui/Button";
import { Field, FormError, PasswordInput } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { AuthCard } from "./AuthCard";

export function ExpiredResetLink() {
  return (
    <AuthCard
      icon={<LockKeyhole className="size-5" aria-hidden />}
      title="This link has expired"
      description="Reset links work once and expire after 1 hour. Request a new one and use the latest email."
    >
      <LinkButton href="/forgot-password" size="lg" className="mt-6 w-full">
        Send a new link
      </LinkButton>
      <LinkButton href="/login" variant="ghost" className="mt-3 w-full">
        Back to log in
      </LinkButton>
    </AuthCard>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || "");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== String(f.get("confirm") || "")) return setError("Passwords don't match");
    setBusy(true);
    try {
      const { user } = await api<{ user: { username: string } }>("/api/auth/reset-password", { json: { token, password } });
      toast.success("Password updated. You're signed in, and every other device was signed out.");
      router.replace(`/u/${user.username}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "BAD_REQUEST" && /expired|used/i.test(err.message)) setExpired(true);
      else setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (expired) return <ExpiredResetLink />;

  return (
    <AuthCard icon={<LockKeyhole className="size-5" aria-hidden />} title="Choose a new password" description="You'll be signed in, and signed out everywhere else.">
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="New password" htmlFor="password" hint="min. 8 characters">
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} maxLength={128} autoFocus />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} maxLength={128} />
        </Field>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
