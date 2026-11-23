"use client";

import clsx from "clsx";
import Link from "next/link";
import { PlusMark, type PlusMarkSize } from "./PlusMark";

/** The fields a name + Plus mark needs. Wider user objects (PublicUser, ViewerDTO) satisfy this. */
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
  size?: PlusMarkSize;
  /** Defaults to true when this component owns the profile link; false when `href` is false. */
  interactive?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  const text = label === "username" ? user.username : user.displayName;
  const to = href === false ? null : (href ?? (user.username ? `/u/${user.username}` : null));
  const markInteractive = interactive ?? href !== false;
  return (
    <span className={clsx("inline-flex max-w-full items-baseline gap-[0.3em] align-middle", className, nameClassName)}>
      {to ? (
        <Link href={to} className="min-w-0 truncate">
          {text}
        </Link>
      ) : (
        <span className="min-w-0 truncate">{text}</span>
      )}
      {user.subscribed ? <PlusMark size={size} inheritFont interactive={markInteractive} className="shrink-0" /> : null}
    </span>
  );
}
