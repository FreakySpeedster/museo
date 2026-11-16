"use client";

import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { PaywallBody } from "@/components/profile/dialogs";

/** Full-page upsell for the blog composer when the account isn't on Plus. */
export function BlogUpsell({ stripeEnabled, priceLabel, editing = false }: { stripeEnabled: boolean; priceLabel: string; editing?: boolean }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-12 sm:pt-16">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-subtle text-accent"><NotebookPen className="size-7" aria-hidden /></span>
        <h1 className="mt-5 text-title font-semibold tracking-tight">{editing ? "Editing posts needs Plus" : "Your nook blog"}</h1>
        <p className="mt-2 text-muted">
          {editing ? "Your published posts stay up. Renew nook Plus to keep editing them." : "Write reviews and stories about the things you collect, tag the items, and they show up on each item's page."}
        </p>
      </div>
      <div className="mt-8 rounded-3xl border border-border bg-surface p-6">
        <PaywallBody stripeEnabled={stripeEnabled} priceLabel={priceLabel} onClose={() => router.push("/blog")} onUpgraded={() => router.refresh()} />
      </div>
    </div>
  );
}
