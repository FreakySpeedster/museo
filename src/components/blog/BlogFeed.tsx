"use client";

import { useState } from "react";
import type { BlogPostSummaryDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PostCard } from "./PostCard";

/** Grid of posts with cursor "Load more". `query` is the list API query string (author / mine). */
export function BlogFeed({ initial, initialCursor, query, showStatus }: { initial: BlogPostSummaryDTO[]; initialCursor: string | null; query: string; showStatus?: boolean }) {
  const toast = useToast();
  const [posts, setPosts] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function more() {
    if (!cursor) return;
    setBusy(true);
    try {
      const r = await api<{ posts: BlogPostSummaryDTO[]; nextCursor: string | null }>(`/api/blog/posts?${query}${query ? "&" : ""}cursor=${encodeURIComponent(cursor)}`);
      setPosts((p) => [...p, ...r.posts]);
      setCursor(r.nextCursor);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load more posts");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => <PostCard key={p.id} post={p} showStatus={showStatus} />)}
      </div>
      {cursor && (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" loading={busy} onClick={() => void more()}>Load more</Button>
        </div>
      )}
    </>
  );
}
