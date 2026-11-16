"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/client";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field, FormError, Input } from "./ui/Field";
import { useToast } from "./ui/Toast";

export function AuthForm({ mode, demoHint }: { mode: "login" | "signup"; demoHint?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const body = isSignup
        ? { email: f.get("email"), username: f.get("username"), displayName: String(f.get("displayName") || "") || undefined, password: f.get("password") }
        : { email: f.get("email"), password: f.get("password") };
      const { user } = await api<{ user: { username: string } }>(`/api/auth/${mode}`, { json: body });
      toast.success(isSignup ? "Welcome to nook! Let’s start your first collection." : "Welcome back!");
      router.push(`/u/${user.username}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function demoLogin() {
    setBusy(true);
    try {
      await api("/api/auth/login", { json: { email: "demo@shelfie.app", password: "demo1234" } });
      router.push("/u/demo");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demo account not available");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--chrome-top))] max-w-md flex-col justify-center px-4 py-10">
      <Card className="p-6 sm:p-8">
        <h1 className="text-title font-semibold tracking-tight">{isSignup ? "Create your nook" : "Welcome back"}</h1>
        <p className="mt-1 text-meta text-muted">{isSignup ? "Your first page is free. No card needed." : "Log in to get back to your collections."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {isSignup && (
            <Field label="Display name" htmlFor="displayName" hint="optional">
              <Input id="displayName" name="displayName" autoComplete="name" maxLength={50} placeholder="Alex Rivera" />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </Field>
          {isSignup && (
            <Field label="Username" htmlFor="username" hint="your public link: /u/username">
              <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={20} placeholder="alexcollects" />
            </Field>
          )}
          <Field label="Password" htmlFor="password" hint={isSignup ? "min. 8 characters" : undefined}>
            <Input id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 8 : 1} />
          </Field>
          {error && <FormError>{error}</FormError>}
          <Button type="submit" loading={busy} className="w-full" size="lg">
            {isSignup ? "Create account" : "Log in"}
          </Button>
        </form>
        {!isSignup && demoHint && (
          <Button variant="ghost" onClick={demoLogin} disabled={busy} className="mt-3 w-full border border-dashed border-border">
            Try the demo account
          </Button>
        )}
        <p className="mt-6 text-center text-meta text-muted">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-foreground underline decoration-accent decoration-2 underline-offset-4">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
