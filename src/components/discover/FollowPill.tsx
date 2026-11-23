"use client";

import clsx from "clsx";
import { Check, Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/client";
import { loginHref } from "@/lib/safe-next";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export type FollowState = "none" | "requested" | "following";

/**
 * Compact Follow / Requested / Following button for discovery cards. Respects follow approval: accounts that
 * approve followers come back as "Requested". Unfollow is optimistic with rollback; follow waits for the answer.
 */
export function FollowPill({
  username,
  displayName,
  initial,
  signedIn,
  className,
  onChange,
}: {
  username: string;
  displayName: string;
  initial: FollowState;
  signedIn: boolean;
  className?: string;
  onChange?: (s: FollowState) => void;
}) {
  const [state, setState] = useState<FollowState>(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(loginHref(`${pathname}${window.location.search}`));
      return;
    }
    if (busy) return;
    const prev = state;
    const undo = prev !== "none";
    setBusy(true);
    if (undo) setState("none");
    try {
      const res = await api<{ state: FollowState }>(`/api/users/${encodeURIComponent(username)}/follow`, { method: undo ? "DELETE" : "POST" });
      setState(res.state);
      onChange?.(res.state);
      if (res.state === "requested") toast.success(`Follow request sent to ${displayName}`);
    } catch (err) {
      setState(prev);
      toast.error(err instanceof ApiError ? err.message : "Couldn't update follow");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={state === "none" ? "primary" : "secondary"}
      loading={busy && state === "none"}
      onClick={toggle}
      aria-label={`${state === "following" ? "Unfollow" : state === "requested" ? "Cancel request to" : "Follow"} ${username}`}
      data-testid="follow-pill"
      className={clsx("min-w-24", className)}
    >
      {state === "following" ? (
        <><Check className="size-4" aria-hidden strokeWidth={2.4} /> Following</>
      ) : state === "requested" ? (
        <><Clock className="size-4" aria-hidden /> Requested</>
      ) : (
        "Follow"
      )}
    </Button>
  );
}
