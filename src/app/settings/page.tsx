import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toViewerDTO } from "@/lib/mappers";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  const pending = await db.followRequest.count({ where: { targetId: viewer.id } });
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-title font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted">Manage how your nook works.</p>
      <div className="mt-8">
        <SettingsView viewer={toViewerDTO(viewer)} pendingRequests={pending} />
      </div>
    </div>
  );
}
