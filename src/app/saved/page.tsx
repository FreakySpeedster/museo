import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loginHref } from "@/lib/safe-next";
import { listSaved } from "@/lib/services/saves";
import { PageHeader } from "@/components/ui/PageHeader";
import { SavedView } from "@/components/saves/SavedView";

export const metadata: Metadata = { title: "Saved", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The viewer's private Want list. */
export default async function SavedPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect(loginHref("/saved"));
  const initial = await listSaved(viewer.id);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <PageHeader
        title="Saved"
        description={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 shrink-0" aria-hidden /> Your Want list. Only you can see it.
          </span>
        }
      />
      <SavedView initial={initial} />
    </div>
  );
}
