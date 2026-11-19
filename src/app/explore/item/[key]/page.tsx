import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCanonicalKey } from "@/lib/canonical";
import { exploreItem, exploreItemPosts } from "@/lib/services/explore";
import { ExploreItemView } from "@/components/explore/ExploreItemView";

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  if (!isCanonicalKey(key)) return { title: "Not found" };
  const hero = await exploreItem(key, null);
  if (!hero) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: hero.title,
    description: `Owned by ${hero.owners} ${hero.owners === 1 ? "person" : "people"} on Museo`,
    openGraph: { title: hero.title, images: hero.imageUrl ? [hero.imageUrl] : undefined },
  };
}

export default async function ExploreItemPage({ params }: Props) {
  const { key } = await params;
  if (!isCanonicalKey(key)) notFound();
  const viewer = await getCurrentUser();
  const [hero, posts] = await Promise.all([exploreItem(key, viewer?.id), exploreItemPosts(key, viewer?.id)]);
  if (!hero || posts.items.length === 0) notFound();
  return <ExploreItemView hero={hero} initial={posts} viewerId={viewer?.id ?? null} />;
}
