"use client";


import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/client";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";

export function PricingActions({ signedIn, subscribed, stripeEnabled, status, hasCustomer }: { signedIn: boolean; subscribed: boolean; stripeEnabled: boolean; status: string; hasCustomer: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) return <Button size="lg" className="w-full" onClick={() => router.push("/signup")}>Sign up to upgrade</Button>;

  if (subscribed) {
    return (
      <div className="space-y-2">
        <Button size="lg" variant="secondary" className="w-full" disabled><Check className="size-4" aria-hidden strokeWidth={2.6} /> You’re on Plus {status === "demo" ? "(demo)" : ""}</Button>
        {!stripeEnabled && status === "demo" && (
          <Button variant="ghost" className="w-full" loading={busy} onClick={() => act(async () => { await api("/api/billing/demo-upgrade", { method: "DELETE" }); toast.info("Demo subscription canceled"); router.refresh(); })}>
            Cancel demo subscription
          </Button>
        )}
        {stripeEnabled && hasCustomer && (
          <Button variant="ghost" className="w-full" loading={busy} onClick={() => act(async () => { const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST", json: {} }); window.location.href = url; })}>
            Manage billing
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      loading={busy}
      data-testid="pricing-upgrade"
      onClick={() =>
        act(async () => {
          if (stripeEnabled) {
            const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: {} });
            window.location.href = url;
          } else {
            await api("/api/billing/demo-upgrade", { method: "POST", json: {} });
            toast.success("nook Plus unlocked (demo mode)");
            router.refresh();
          }
        })
      }
    >
      {stripeEnabled ? "Upgrade with Stripe" : "Upgrade (demo mode)"}
    </Button>
  );
}
