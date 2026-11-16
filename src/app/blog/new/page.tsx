import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { tagItemsByIds } from "@/lib/services/blog";
import { BlogComposer } from "@/components/blog/BlogComposer";
import { BlogUpsell } from "@/components/blog/BlogUpsell";

export const metadata: Metadata = { title: "New post", robots: { index: false } };
export const dynamic = "force-dynamic";

/** ?item=<id> pre-tags an item (from "Write about this" on an item). */
export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const [viewer, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (!viewer) redirect("/login");
  if (!viewer.subscribed) return <BlogUpsell stripeEnabled={stripeConfigured()} priceLabel={process.env.PLUS_PRICE_LABEL || "$4 / month"} />;
  const initialItems = sp.item ? await tagItemsByIds(viewer.id, [sp.item.slice(0, 40)]) : [];
  return <BlogComposer initialItems={initialItems} />;
}
