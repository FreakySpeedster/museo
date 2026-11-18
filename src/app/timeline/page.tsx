import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userTimeline } from "@/lib/services/feed";
import { PageHeader } from "@/components/ui/PageHeader";
import { OwnerTimeline } from "@/components/profile/OwnerTimeline";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const initial = await userTimeline(viewer.id, undefined, viewer.id);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <PageHeader title="Timeline" description="Everything you've added, newest first. Only you can see this." />
      <OwnerTimeline username={viewer.username} initial={initial} />
    </div>
  );
}
