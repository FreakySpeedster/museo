"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { UserName } from "@/components/ui/UserName";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { plural } from "@/lib/plural";

export type ConnectionKind = "followers" | "following";

/**
 * Instagram-style followers / following list: a centred dialog on desktop and a bottom sheet on phones
 * (Modal handles both). Server-side search (debounced) and cursor pagination with infinite scroll.
 */
export function FollowListDialog({
  open,
  username,
  initialKind,
  counts,
  signedIn,
  onClose,
  onViewerFollowChange,
}: {
  open: boolean;
  username: string;
  initialKind: ConnectionKind;
  counts: { followers: number; following: number };
  signedIn: boolean;
  onClose: () => void;
  /** The viewer followed / unfollowed someone from the list (lets the profile adjust its "following" count when it's theirs). */
  onViewerFollowChange?: (delta: 1 | -1) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`@${username}`} size="sm">
      {open && <FollowListBody key={initialKind} username={username} initialKind={initialKind} counts={counts} signedIn={signedIn} onNavigate={onClose} onViewerFollowChange={onViewerFollowChange} />}
    </Modal>
  );
}

function FollowListBody({
  username,
  initialKind,
  counts,
  signedIn,
  onNavigate,
  onViewerFollowChange,
}: {
  username: string;
  initialKind: ConnectionKind;
  counts: { followers: number; following: number };
  signedIn: boolean;
  onNavigate: () => void;
  onViewerFollowChange?: (delta: 1 | -1) => void;
}) {
  const [kind, setKind] = useState<ConnectionKind>(initialKind);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ConnectionDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sentinel = useRef<HTMLLIElement>(null);
  const reqId = useRef(0);

  // Debounce typing into the server query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(
    (cur: string | null) => {
      const sp = new URLSearchParams();
      if (query) sp.set("q", query);
      if (cur) sp.set("cursor", cur);
      return api<{ users: ConnectionDTO[]; nextCursor: string | null }>(`/api/users/${username}/${kind}?${sp}`);
    },
    [kind, query, username],
  );

  // First page (and again whenever the tab or search changes).
  useEffect(() => {
    const id = ++reqId.current;
    fetchPage(null)
      .then((res) => {
        if (id !== reqId.current) return;
        setUsers(res.users);
        setCursor(res.nextCursor);
        setError("");
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setUsers([]);
        setError(e instanceof ApiError ? e.message : "Couldn't load this list");
      });
  }, [fetchPage]);

  const load = useCallback(
    async (cur: string) => {
      const id = ++reqId.current;
      setLoadingMore(true);
      try {
        const res = await fetchPage(cur);
        if (id !== reqId.current) return;
        setUsers((prev) => [...(prev ?? []), ...res.users.filter((u) => !prev?.some((p) => p.id === u.id))]);
        setCursor(res.nextCursor);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof ApiError ? e.message : "Couldn't load more");
      } finally {
        if (id === reqId.current) setLoadingMore(false);
      }
    },
    [fetchPage],
  );

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loadingMore) void load(cursor);
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadingMore, load]);

  function patch(id: string, followState: ConnectionDTO["followState"]) {
    setUsers((list) => list?.map((u) => (u.id === id ? { ...u, followState } : u)) ?? list);
  }

  return (
    <div className="-mx-5 -my-5 flex h-[70dvh] flex-col sm:-mx-6 sm:h-[min(560px,75dvh)]">
      <div className="space-y-3 border-b border-border px-5 pb-3 sm:px-6">
        <Tabs
          label="Connections"
          className="-mx-5 sm:-mx-6"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setUsers(null);
            setCursor(null);
          }}
          options={[
            { value: "followers", label: <><span className="font-semibold">{counts.followers.toLocaleString("en-US")}</span> {plural("follower", counts.followers)}</> },
            { value: "following", label: <><span className="font-semibold">{counts.following.toLocaleString("en-US")}</span> following</> },
          ]}
        />
        <label className="relative block">
          <span className="sr-only">Search {kind}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            data-autofocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-border bg-surface-hover pl-9 pr-9 text-meta outline-none transition placeholder:text-muted focus:border-accent focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground">
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3" aria-live="polite">
        {users === null ? (
          <ul aria-busy="true" className="space-y-1">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        ) : error && users.length === 0 ? (
          <p className="px-4 py-10 text-center text-meta text-muted">{error}</p>
        ) : users.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Users className="mx-auto size-9 text-muted" aria-hidden strokeWidth={1.5} />
              <p className="mt-3 font-medium">{query ? "No matches" : kind === "followers" ? "No followers yet" : "Not following anyone yet"}</p>
              {query && <p className="mt-1 text-meta text-muted">Nobody here matches “{query}”.</p>}
            </div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {users.map((u) => (
              <ConnectionRow key={u.id} user={u} signedIn={signedIn} onNavigate={onNavigate} onChange={(s, prev) => {
                patch(u.id, s);
                if (prev === "following" && s !== "following") onViewerFollowChange?.(-1);
                if (prev !== "following" && s === "following") onViewerFollowChange?.(1);
              }} />
            ))}
            {cursor && (
              <li ref={sentinel} className="flex justify-center py-3">
                <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => void load(cursor)}>Load more</Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConnectionRow({
  user,
  signedIn,
  onNavigate,
  onChange,
}: {
  user: ConnectionDTO;
  signedIn: boolean;
  onNavigate: () => void;
  onChange: (state: ConnectionDTO["followState"], prev: ConnectionDTO["followState"]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const state = user.followState;

  async function toggle() {
    if (!signedIn) return router.push("/login");
    const undo = state !== "none";
    const prev = state;
    // Unfollow / cancel is optimistic; following waits briefly because it may become a request.
    if (undo) onChange("none", prev);
    else setBusy(true);
    try {
      const res = await api<{ state: ConnectionDTO["followState"] }>(`/api/users/${user.username}/follow`, { method: undo ? "DELETE" : "POST" });
      if (!undo) onChange(res.state, prev);
      if (res.state === "requested") toast.success(`Follow request sent to ${user.displayName}`);
    } catch (e) {
      if (undo) onChange(prev, "none");
      toast.error(e instanceof ApiError ? e.message : "Couldn't update follow");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-surface-hover">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href={`/u/${user.username}`} onClick={onNavigate} className="shrink-0 rounded-full">
          <Avatar name={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size={44} />
        </Link>
        <span className="min-w-0">
          <UserName user={user} label="username" nameClassName="text-meta font-semibold" className="min-w-0" />
          <span className="block truncate text-caption text-muted">{user.displayName}</span>
        </span>
      </div>
      {!user.isViewer && (
        <Button
          size="sm"
          variant={state === "none" ? "primary" : "secondary"}
          loading={busy}
          onClick={() => void toggle()}
          className={clsx("shrink-0", "min-w-24")}
          aria-label={`${state === "following" ? "Unfollow" : state === "requested" ? "Cancel request to" : "Follow"} ${user.username}`}
        >
          {state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow"}
        </Button>
      )}
    </li>
  );
}
