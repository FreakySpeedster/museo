import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { LinkButton } from "./ui/Button";

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="glass sticky top-0 z-40 border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 text-sm sm:flex" aria-label="Main">
            {user && (
              <Link href={`/u/${user.username}`} className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-ink">
                My shelves
              </Link>
            )}
            <Link href="/pricing" className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-ink">
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} plus={user.subscribed} />
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
