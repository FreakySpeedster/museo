import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userTimeline } from "@/lib/services/feed";
import { OwnerTimeline } from "@/components/profile/OwnerTimeline";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const initial = await userTimeline(viewer.id, undefined, viewer.id);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-title font-semibold tracking-tight">Timeline</h1>
      <p className="mt-1 text-muted">Everything you&apos;ve added, newest first. Only you can see this.</p>
      <div className="mt-8">
        <OwnerTimeline username={viewer.username} initial={initial} />
      </div>
    </div>
  );
}
