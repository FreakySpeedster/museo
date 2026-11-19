import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getVisibleItem } from "@/lib/services/items";
import { ItemPageView } from "@/components/profile/ItemPageView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentUser();
  try {
    const item = await getVisibleItem(id, viewer?.id);
    return {
      title: item.title,
      description: item.description || `${item.title} in ${item.shelf.name} · @${item.user.username}`,
      openGraph: {
        title: item.title,
        description: item.description || `Saved by ${item.user.displayName} on Museo`,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      },
    };
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  let item;
  try {
    item = await getVisibleItem(id, viewer?.id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  return <ItemPageView item={item} viewerId={viewer?.id ?? null} />;
}
