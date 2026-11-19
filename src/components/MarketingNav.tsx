"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LinkButton } from "./ui/Button";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Log in" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="app-phone-top sticky top-0 z-[var(--z-nav)] border-b border-border/80 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label="Museo home"
          onClick={() => setOpen(false)}
        >
          <LogoMark className="h-[1.375rem] -translate-y-px" />
          <Wordmark className="text-heading leading-none" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-meta text-muted transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <LinkButton href="/signup" size="sm" className="ml-1">
            Sign up
          </LinkButton>
          <ThemeToggle className="ml-1" />
        </nav>
        <div className="flex items-center gap-0.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            data-hit="compact"
            aria-expanded={open}
            aria-controls="marketing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-xl text-foreground transition-colors hover:bg-surface-hover"
          >
            {open ? <X className="size-5" aria-hidden strokeWidth={1.8} /> : <Menu className="size-5" aria-hidden strokeWidth={1.8} />}
          </button>
        </div>
      </div>
      {open ? (
        <div id="marketing-menu" className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3 text-body text-foreground transition-colors hover:bg-surface-hover"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <LinkButton href="/signup" className="mt-1 w-full" onClick={() => setOpen(false)}>
              Sign up
            </LinkButton>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
