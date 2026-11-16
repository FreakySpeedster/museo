import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { stripeConfigured } from "@/lib/env";
import { getPostForEdit } from "@/lib/services/blog";
import { BlogComposer } from "@/components/blog/BlogComposer";
import { BlogUpsell } from "@/components/blog/BlogUpsell";

export const metadata: Metadata = { title: "Edit post", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getCurrentUser()]);
  if (!viewer) redirect("/login");
  let post;
  try {
    post = await getPostForEdit(viewer.id, id);
  } catch (e) {
    if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
  if (!viewer.subscribed) return <BlogUpsell stripeEnabled={stripeConfigured()} priceLabel={process.env.PLUS_PRICE_LABEL || "$4 / month"} editing />;
  return <BlogComposer key={post.id} post={{ id: post.id, title: post.title, contentHtml: post.contentHtml, status: post.status, items: post.items }} />;
}
