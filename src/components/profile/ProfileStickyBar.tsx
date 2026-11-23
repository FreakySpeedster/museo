"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { STICKY_TOP_CLASS, isCompactIdentityShown, stickyObserverOptions, type ShellKind } from "@/lib/profile-chrome";
import { CompactIdentity } from "./CompactIdentity";

interface Props {
  headerRef: RefObject<HTMLDivElement | null>;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  subscribed?: boolean;
  children?: ReactNode;
}

function useCompactWhenAway(target: RefObject<HTMLDivElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let io: IntersectionObserver | null = null;
    const mq = window.matchMedia("(min-width: 768px)");
    const shell = (document.querySelector("[data-shell]")?.getAttribute("data-shell") as ShellKind | null) ?? "marketing";
    const attach = () => {
      io?.disconnect();
      io = new IntersectionObserver(([entry]) => entry && setCompact(isCompactIdentityShown(entry.isIntersecting)), stickyObserverOptions(mq.matches, shell));
      io.observe(el);
    };
    attach();
    mq.addEventListener("change", attach);
    return () => {
      mq.removeEventListener("change", attach);
      io?.disconnect();
    };
  }, [target]);
  return compact;
}

/** Pins the page switcher to the top of the viewport (below the phone top bar); compact identity slides in once the header is gone. */
export function ProfileStickyBar({ headerRef, displayName, username, avatarUrl, subscribed, children }: Props) {
  const compact = useCompactWhenAway(headerRef);
  return (
    <div className={`sticky z-30 -mx-4 sm:-mx-6 ${STICKY_TOP_CLASS}`} data-testid="profile-sticky-bar" data-compact={compact ? "true" : "false"}>
      <div className="profile-sticky-bg flex min-h-12 items-center gap-1 px-4 sm:px-6">
        <CompactIdentity visible={compact} displayName={displayName} username={username} avatarUrl={avatarUrl} subscribed={subscribed} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
