import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getVisibleItem } from "@/lib/services/items";
import { OutboundNotice } from "@/components/out/OutboundNotice";

type Props = { params: Promise<{ itemId: string }> };

export const metadata: Metadata = { title: "Leaving Museo", robots: { index: false, follow: false } };

/**
 * Outbound-link interstitial. Item-id based (not ?u=...), so it can only ever send people to a link that
 * passed the posting checks: never an open redirect.
 */
export default async function OutPage({ params }: Props) {
  const { itemId } = await params;
  const viewer = await getCurrentUser();
  let item;
  try {
    item = await getVisibleItem(itemId, viewer?.id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (!item.url) notFound();
  let url: URL;
  try {
    url = new URL(item.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") notFound();
  } catch {
    notFound();
  }
  return (
    <OutboundNotice
      itemId={item.id}
      href={url.toString()}
      host={url.hostname.replace(/^www\./, "")}
      title={item.title}
      username={item.user.username}
      flag={item.linkFlag ?? null}
      editedAt={item.urlEditedAt ?? null}
    />
  );
}
