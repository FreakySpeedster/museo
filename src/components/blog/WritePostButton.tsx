"use client";

import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PaywallDialog } from "@/components/profile/dialogs";

/** Plus: goes to the composer. Free: opens the Plus upsell. Signed out: log in first. */
export function WritePostButton({ plan, stripeEnabled, priceLabel, size = "md", label = "Write a post" }: { plan: "plus" | "free" | "guest"; stripeEnabled: boolean; priceLabel: string; size?: "sm" | "md" | "lg"; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} data-testid="write-post" onClick={() => (plan === "plus" ? router.push("/blog/new") : plan === "guest" ? router.push("/login") : setOpen(true))}>
        <PenLine className="size-4" aria-hidden /> {label}
      </Button>
      {plan === "free" && (
        <PaywallDialog
          open={open}
          reason="blog"
          stripeEnabled={stripeEnabled}
          priceLabel={priceLabel}
          onClose={() => setOpen(false)}
          onUpgraded={() => {
            setOpen(false);
            router.push("/blog/new");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
