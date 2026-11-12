"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TimelineEntry } from "@/lib/dto";
import { Avatar } from "@/components/ui/Avatar";
import { ItemBody } from "./ItemModal";

export function ItemPageView({ item, viewerId }: { item: TimelineEntry; viewerId?: string | null }) {
  const router = useRouter();
  const [it, setIt] = useState(item);
  const shelf = {
    id: it.shelf.id,
    pageId: it.page.id,
    name: it.shelf.name,
    category: it.shelf.category,
    position: 0,
    visibility: it.shelf.visibility,
    items: [it],
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href={`/u/${it.user.username}`} className="mb-6 flex items-center gap-3 w-fit">
        <Avatar name={it.user.displayName} username={it.user.username} avatarUrl={it.user.avatarUrl} size="sm" />
        <span>
          <span className="block text-meta font-semibold">{it.user.displayName}</span>
          <span className="block text-caption text-muted">@{it.user.username} · {it.shelf.name}</span>
        </span>
      </Link>
      <ItemBody
        it={it}
        shelf={shelf}
        isOwner={viewerId === it.user.id}
        viewerId={viewerId}
        onUpdated={(u) => setIt({ ...it, ...u })}
        onDeleted={() => router.push(`/u/${it.user.username}`)}
      />
    </div>
  );
}
