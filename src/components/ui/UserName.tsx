"use client";

import clsx from "clsx";
import Link from "next/link";
import { PlusSeal, type PlusSealSize } from "./PlusSeal";

/** The fields a name + Plus seal needs. Wider user objects (PublicUser, ViewerDTO) satisfy this. */
export type NameUser = {
  username: string;
  displayName: string;
  subscribed?: boolean;
};

export function UserName({
  user,
  href,
  label = "display",
  size = "md",
  interactive,
  className,
  nameClassName,
}: {
  user: NameUser;
  /** Profile URL. Pass false to render plain text when a parent is already the link, or you're already on the profile. */
  href?: string | false;
  label?: "display" | "username";
  size?: PlusSealSize;
  /** Defaults to true when this component owns the profile link; false when `href` is false. */
  interactive?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  const text = label === "username" ? user.username : user.displayName;
  const to = href === false ? null : (href ?? (user.username ? `/u/${user.username}` : null));
  const sealInteractive = interactive ?? href !== false;
  return (
    <span className={clsx("inline-flex max-w-full items-center gap-1 align-middle", className)}>
      {to ? (
        <Link href={to} className={clsx("min-w-0 truncate", nameClassName)}>
          {text}
        </Link>
      ) : (
        <span className={clsx("min-w-0 truncate", nameClassName)}>{text}</span>
      )}
      {user.subscribed ? <PlusSeal size={size} interactive={sealInteractive} className="shrink-0" /> : null}
    </span>
  );
}
