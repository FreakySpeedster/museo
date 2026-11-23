"use client";

import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { UserName } from "@/components/ui/UserName";
import { reducedMotion } from "@/lib/gsap";

interface Props {
  visible: boolean;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  subscribed?: boolean;
}

/** Compact identity for the sticky profile bar. Width collapses to 0 when hidden so the bar height never changes. */
export function CompactIdentity({ visible, displayName, username, avatarUrl, subscribed }: Props) {
  return (
    <div
      data-testid="compact-identity"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
      className={clsx(
        "grid min-w-0 shrink-0 overflow-hidden transition-[grid-template-columns,opacity] duration-300 ease-out motion-reduce:transition-none",
        visible ? "grid-cols-[1fr] opacity-100" : "pointer-events-none grid-cols-[0fr] opacity-0",
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" })}
          aria-label={`Back to top of ${displayName}'s profile`}
          className="flex max-w-[9.5rem] items-center gap-2 pr-2 sm:max-w-[14rem] sm:pr-3"
        >
          <Avatar name={displayName} username={username} avatarUrl={avatarUrl} size={32} className="ring-2 ring-background" />
          <span className="min-w-0 text-left leading-tight">
            <UserName
              user={{ displayName, username, subscribed }}
              href={false}
              interactive={false}
              size="sm"
              nameClassName="text-meta font-semibold tracking-tight"
              className="max-w-full"
            />
            <span className="block truncate text-caption text-muted">@{username}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
