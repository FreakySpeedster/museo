"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field, FormError, Input, PasswordInput } from "./ui/Field";
import { Spinner } from "./ui/Button";
import { useToast } from "./ui/Toast";

/** `next`: a same-origin path to return to after signing in (already checked with safeNext on the server). */
export function AuthForm({ mode, demoHint, next }: { mode: "login" | "signup"; demoHint?: boolean; next?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";
  const [username, setUsername] = useState("");
  const [check, setCheck] = useState<{ state: "idle" | "checking" | "ok" | "bad"; reason?: string | null }>({ state: "idle" });

  // Live username availability (debounced) on signup.
  useEffect(() => {
    if (!isSignup) return;
    const u = username.trim().toLowerCase();
    if (u.length < 3) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ available: boolean; reason: string | null }>(`/api/auth/username?u=${encodeURIComponent(u)}`);
        setCheck(r.available ? { state: "ok" } : { state: "bad", reason: r.reason });
      } catch {
        setCheck({ state: "idle" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username, isSignup]);
  const status = username.trim().length < 3 ? { state: "idle" as const } : check;

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
      toast.success(isSignup ? "Welcome to Museo! Let’s start your first collection." : "Welcome back!");
      router.push(next ?? `/u/${user.username}`);
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
      router.push(next ?? "/u/demo");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demo account not available");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--chrome-top))] max-w-md flex-col px-4 pb-10 pt-8 sm:justify-center sm:py-10">
      <Card className="max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none sm:p-8">
        <h1 className="text-title font-semibold tracking-tight">{isSignup ? "Join Museo" : "Welcome back"}</h1>
        <p className="mt-1 text-meta text-muted">{isSignup ? "Your first page is free. No card needed." : "Log in to get back to your collections."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {isSignup && (
            <Field label="Display name" htmlFor="displayName" hint="optional">
              <Input id="displayName" name="displayName" autoComplete="name" autoCapitalize="words" enterKeyHint="next" maxLength={50} placeholder="Alex Rivera" />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" required placeholder="you@example.com" />
          </Field>
          {isSignup && (
            <Field label="Username" htmlFor="username" hint={`Your link: /u/${username.trim().toLowerCase() || "username"}`}>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  minLength={3}
                  maxLength={20}
                  placeholder="alexcollects"
                  value={username}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s/g, "");
                    setUsername(v);
                    setCheck({ state: v.trim().length >= 3 ? "checking" : "idle" });
                  }}
                  aria-describedby="username-status"
                  aria-invalid={status.state === "bad" || undefined}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 grid w-12 place-items-center" aria-hidden>
                  {status.state === "checking" && <Spinner />}
                  {status.state === "ok" && <Check className="size-5 text-success" strokeWidth={2.4} />}
                  {status.state === "bad" && <X className="size-5 text-danger" strokeWidth={2.4} />}
                </span>
              </div>
              <p id="username-status" aria-live="polite" className={clsx("empty:hidden", status.state === "bad" ? "text-caption text-danger" : "text-caption text-success")}>
                {status.state === "bad" ? status.reason : status.state === "ok" ? "Available" : ""}
              </p>
            </Field>
          )}
          <Field label="Password" htmlFor="password" hint={isSignup ? "min. 8 characters" : undefined}>
            <PasswordInput id="password" name="password" autoComplete={isSignup ? "new-password" : "current-password"} enterKeyHint="go" required minLength={isSignup ? 8 : 1} />
          </Field>
          {!isSignup && (
            <div className="-mt-2 flex justify-end">
              <Link href="/forgot-password" className="rounded-sm text-meta text-muted underline-offset-4 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
          {error && <FormError>{error}</FormError>}
          <Button type="submit" loading={busy} className="w-full" size="lg">
            {isSignup ? "Create account" : "Log in"}
          </Button>
        </form>
        {!isSignup && demoHint && process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
          <Button variant="ghost" onClick={demoLogin} disabled={busy} className="mt-3 w-full border border-dashed border-border">
            Try the demo account
          </Button>
        )}
        <p className="mt-6 text-center text-meta text-muted">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link href={`${isSignup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline decoration-accent decoration-2 underline-offset-4">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
