"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowUpRight, Globe, ShieldAlert, TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { timeAgo } from "@/lib/time";
import { useRouter } from "next/navigation";

const COPY = {
  reported: {
    icon: ShieldAlert,
    title: "This link was reported",
    body: "Several people reported it as a scam or unsafe. Don't enter passwords, codes or payment details there.",
    tone: "border-danger/40 bg-danger-subtle text-danger",
  },
  unverified: {
    icon: TriangleAlert,
    title: "We couldn't check this link",
    body: "Our safety check didn't finish when it was posted. Make sure you trust the site before continuing.",
    tone: "border-warning/40 bg-warning-subtle text-warning",
  },
} as const;

export function OutboundNotice({
  itemId,
  href,
  host,
  title,
  username,
  flag,
  editedAt,
}: {
  itemId: string;
  href: string;
  host: string;
  title: string;
  username: string;
  flag: "reported" | "unverified" | null;
  editedAt: string | null;
}) {
  const warn = flag ? COPY[flag] : null;
  const router = useRouter();
  function goBack() {
    // Opened in a new tab: close it if the browser lets us, else return to the post.
    if (window.history.length > 1) window.history.back();
    else {
      window.close();
      router.replace(`/i/${itemId}`);
    }
  }
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-5 py-10" data-testid="outbound">
      <p className="text-micro font-medium uppercase tracking-wide text-muted">You&apos;re leaving Museo</p>
      <div className="mt-4 flex items-center gap-3">
        <span className={clsx("grid size-12 shrink-0 place-items-center rounded-2xl", warn ? warn.tone : "bg-surface-hover text-foreground")}>
          {warn ? <warn.icon className="size-6" aria-hidden /> : <Globe className="size-6" aria-hidden />}
        </span>
        <h1 className="min-w-0 break-all text-title font-semibold leading-tight tracking-tight" data-testid="outbound-host">{host}</h1>
      </div>
      <p className="mt-3 line-clamp-3 break-all rounded-xl bg-surface-hover px-3 py-2 font-mono text-caption text-muted" title={href}>{href}</p>
      <p className="mt-3 text-meta text-muted">
        From <span className="font-medium text-foreground">{title}</span> by @{username}
        {editedAt && <span> · Link edited {timeAgo(editedAt)}</span>}
      </p>
      {warn && (
        <div role="alert" className={clsx("mt-5 rounded-2xl border p-4", warn.tone)}>
          <p className="text-meta font-semibold">{warn.title}</p>
          <p className="mt-1 text-meta text-foreground/90">{warn.body}</p>
        </div>
      )}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {warn ? (
          <>
            <button type="button" onClick={goBack} className={buttonClass("primary", "lg", "w-full")}>
              <ArrowLeft className="size-5" aria-hidden /> Go back
            </button>
            <a href={href} rel="noopener noreferrer nofollow ugc" referrerPolicy="no-referrer" className={buttonClass("secondary", "lg", "w-full")} data-testid="outbound-continue">
              Continue anyway
            </a>
          </>
        ) : (
          <>
            <a href={href} rel="noopener noreferrer nofollow ugc" referrerPolicy="no-referrer" className={buttonClass("primary", "lg", "w-full sm:order-2")} data-testid="outbound-continue">
              Continue <ArrowUpRight className="size-5" aria-hidden />
            </a>
            <button type="button" onClick={goBack} className={buttonClass("secondary", "lg", "w-full sm:order-1")}>
              Go back
            </button>
          </>
        )}
      </div>
      <p className="mt-5 text-caption text-muted">Links are posted by members. Museo checks them for known scams, but can&apos;t vouch for every site.</p>
    </main>
  );
}
