"use client";

import clsx from "clsx";
import { History, LayoutGrid } from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { APP_NAV_TOP_CLASS, STICKY_OBSERVER_OPTIONS, isCompactIdentityShown } from "@/lib/profile-chrome";
import { CompactIdentity } from "./CompactIdentity";

interface Props {
  headerRef: RefObject<HTMLDivElement | null>;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  tab: "shelves" | "timeline";
  onSelectTab: (tab: "shelves" | "timeline") => void;
  children?: ReactNode;
}

function useCompactWhenAway(target: RefObject<HTMLDivElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) setCompact(isCompactIdentityShown(entry.isIntersecting));
    }, STICKY_OBSERVER_OPTIONS);
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return compact;
}

/** Pins section + page tabs below the app navbar; reveals compact identity once the profile header leaves view. */
export function ProfileStickyBar({ headerRef, displayName, username, avatarUrl, tab, onSelectTab, children }: Props) {
  const compact = useCompactWhenAway(headerRef);

  return (
    <div
      className={clsx("sticky z-30 -mx-4 sm:-mx-6", APP_NAV_TOP_CLASS)}
      data-testid="profile-sticky-bar"
      data-compact={compact ? "true" : "false"}
    >
      <div className="profile-sticky-bg px-4 sm:px-6">
        <div className="flex h-11 min-w-0 items-center gap-2 sm:gap-3">
          <CompactIdentity visible={compact} displayName={displayName} username={username} avatarUrl={avatarUrl} />
          <div role="tablist" aria-label="Profile sections" className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto">
            <div className="inline-flex shrink-0 rounded-full border border-line bg-surface p-1">
              {(["shelves", "timeline"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  data-testid={`tab-${t}`}
                  onClick={() => onSelectTab(t)}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition sm:px-5",
                    tab === t ? "bg-ink text-bg shadow" : "text-muted hover:text-ink",
                  )}
                >
                  {t === "shelves" ? (
                    <>
                      <LayoutGrid className="size-4" aria-hidden /> Shelves
                    </>
                  ) : (
                    <>
                      <History className="size-4" aria-hidden /> Timeline
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
