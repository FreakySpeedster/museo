import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toViewerDTO } from "@/lib/mappers";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const pending = await db.followRequest.count({ where: { targetId: viewer.id } });
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
      <PageHeader title="Settings" />
      <SettingsView viewer={toViewerDTO(viewer)} pendingRequests={pending} />
    </div>
  );
}
