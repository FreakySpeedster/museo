import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications, markAllRead } from "@/lib/services/notifications";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  // Fetch first so this visit still highlights what was new, then clear the badge.
  const initial = await listNotifications(viewer.id);
  await markAllRead(viewer.id);
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-title font-semibold tracking-tight">Notifications</h1>
      <p className="mt-1 text-muted">Likes, comments and follow requests on your nook.</p>
      <div className="mt-8">
        <NotificationsList initial={initial} />
      </div>
    </div>
  );
}
