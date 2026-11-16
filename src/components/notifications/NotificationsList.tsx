"use client";

import clsx from "clsx";
import { Bell, Heart, MessageCircle, Reply, UserCheck, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { NotificationDTO, NotificationType } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { READ_EVENT } from "./useUnreadCount";

const META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  LIKE: { icon: Heart, tone: "bg-danger text-white" },
  COMMENT: { icon: MessageCircle, tone: "bg-accent text-accent-contrast" },
  REPLY: { icon: Reply, tone: "bg-accent text-accent-contrast" },
  FOLLOW: { icon: UserPlus, tone: "bg-accent text-accent-contrast" },
  FOLLOW_REQUEST: { icon: UserPlus, tone: "bg-accent text-accent-contrast" },
  FOLLOW_ACCEPTED: { icon: UserCheck, tone: "bg-success text-white" },
};

function message(n: NotificationDTO) {
  const item = n.item ? <span className="font-medium text-foreground">{n.item.title}</span> : "your item";
  switch (n.type) {
    case "LIKE":
      return <>liked {item}</>;
    case "COMMENT":
      return <>commented on {item}</>;
    case "REPLY":
      return <>replied to your comment on {item}</>;
    case "FOLLOW":
      return <>started following you</>;
    case "FOLLOW_REQUEST":
      return n.pending ? <>wants to follow you</> : <>requested to follow you</>;
    case "FOLLOW_ACCEPTED":
      return <>accepted your follow request</>;
  }
}

const href = (n: NotificationDTO) => (n.item ? `/i/${n.item.id}` : `/u/${n.actor.username}`);

export function NotificationsList({ initial }: { initial: { notifications: NotificationDTO[]; nextCursor: string | null } }) {
  const [list, setList] = useState(initial.notifications);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    window.dispatchEvent(new Event(READ_EVENT));
  }, []);

  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const r = await api<{ notifications: NotificationDTO[]; nextCursor: string | null }>(`/api/notifications?cursor=${encodeURIComponent(cursor)}`);
      setList((l) => [...l, ...r.notifications]);
      setCursor(r.nextCursor);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load more");
    } finally {
      setLoading(false);
    }
  }

  async function respond(n: NotificationDTO, accept: boolean) {
    setBusy(n.id);
    try {
      await api(`/api/follow-requests/${n.actor.username}`, { json: { accept } });
      setList((l) => (accept ? l.map((x) => (x.id === n.id ? { ...x, type: "FOLLOW", pending: false } : x)) : l.filter((x) => x.id !== n.id)));
      toast.success(accept ? `${n.actor.displayName} now follows you` : "Request removed");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the request");
      if (e instanceof ApiError && e.code === "NOT_FOUND") setList((l) => l.map((x) => (x.id === n.id ? { ...x, pending: false } : x)));
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) {
    return <EmptyState icon={<Bell className="size-8" aria-hidden />} title="No notifications yet" description="When people like or comment on your items, or ask to follow you, it shows up here." />;
  }

  const fresh = list.filter((n) => !n.read);
  const earlier = list.filter((n) => n.read);
  const section = (title: string, rows: NotificationDTO[]) =>
    rows.length > 0 && (
      <section aria-label={title}>
        <h2 className="mb-2 px-3 text-micro font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <ul className="flex flex-col gap-0.5">
          {rows.map((n) => {
            const m = META[n.type];
            const requesting = n.type === "FOLLOW_REQUEST" && n.pending;
            return (
              <li key={n.id} className={clsx("relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-hover", !n.read && "bg-surface")}>
                <Link href={href(n)} className="absolute inset-0 rounded-2xl" aria-label={`${n.actor.displayName} ${n.type.toLowerCase().replace("_", " ")}${n.item ? `: ${n.item.title}` : ""}`} />
                <span className="relative shrink-0">
                  <Avatar name={n.actor.displayName} username={n.actor.username} avatarUrl={n.actor.avatarUrl} size={44} />
                  <span className={clsx("absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full ring-2 ring-[var(--background)]", m.tone)}>
                    <m.icon className="size-3" aria-hidden strokeWidth={2.4} fill={n.type === "LIKE" ? "currentColor" : "none"} />
                  </span>
                </span>
                <div className="min-w-0 flex-1 text-meta">
                  <p className="line-clamp-2 text-muted">
                    <span className="font-semibold text-foreground">{n.actor.displayName}</span> {message(n)}
                  </p>
                  {n.excerpt && <p className="mt-0.5 line-clamp-1 text-foreground">“{n.excerpt}”</p>}
                  <p className="mt-0.5 text-caption text-muted">{timeAgo(n.createdAt)}</p>
                </div>
                {requesting ? (
                  <div className="relative z-10 flex shrink-0 gap-1.5">
                    <Button size="sm" loading={busy === n.id} disabled={busy !== null} onClick={() => respond(n, true)}>Accept</Button>
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => respond(n, false)}>Reject</Button>
                  </div>
                ) : n.item?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.item.imageUrl} alt="" className="size-11 shrink-0 rounded-lg border border-border object-cover" loading="lazy" />
                ) : null}
                {!n.read && <span className="absolute left-0.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-danger" aria-label="New" />}
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-6">
      {section("New", fresh)}
      {section("Earlier", earlier)}
      {cursor && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loading} onClick={more}>Load more</Button>
        </div>
      )}
    </div>
  );
}
