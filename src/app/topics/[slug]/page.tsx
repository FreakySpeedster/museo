import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { getTopic, isTopicSlug } from "@/lib/services/discovery";
import { plural } from "@/lib/plural";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { PhoneHeader } from "@/components/ui/PushedScreen";
import { UserName } from "@/components/ui/UserName";
import { ItemThumb } from "@/components/profile/ItemThumb";
import { SaveButton } from "@/components/saves/SaveButton";
import { CollectionCard, collectionHref } from "@/components/discover/CollectionCard";
import { PeopleRow, SectionHead } from "@/components/discover/DiscoverRail";
import { TopicChips } from "@/components/discover/TopicChips";

type Props = { params: Promise<{ slug: string }> };

/** Signed-out view of the topic for metadata (shared with crawlers); one fetch per request. */
const publicTopic = cache((slug: string) => getTopic(slug, null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isTopicSlug(slug)) return { title: "Not found", robots: { index: false, follow: false } };
  const t = await publicTopic(slug);
  if (!t) return { title: "Not found", robots: { index: false, follow: false } };
  const title = `${t.label} collections`;
  const description =
    t.stats.items > 0
      ? `Explore ${t.stats.items.toLocaleString("en-US")} ${t.label.toLowerCase()} finds from ${t.stats.collectors.toLocaleString("en-US")} ${plural("collector", t.stats.collectors)} on Museo: top collections, new additions and people to follow.`
      : `Discover ${t.label.toLowerCase()} collections on Museo and show off what you collect.`;
  const image = t.items.find((i) => i.imageUrl)?.imageUrl;
  return {
    title,
    description,
    alternates: { canonical: `/topics/${slug}` },
    openGraph: { title: `${title} · Museo`, description, url: `/topics/${slug}`, type: "website", images: image ? [image] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${title} · Museo`, description },
    // Empty topics stay out of search results until they have something to show.
    robots: t.stats.items > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  if (!isTopicSlug(slug)) notFound();
  const viewer = await getCurrentUser();
  const t = viewer ? await getTopic(slug, viewer.id) : await publicTopic(slug);
  if (!t) notFound();
  const signedIn = Boolean(viewer);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${t.label} collections`,
    about: t.label,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: t.collections.slice(0, 8).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: new URL(collectionHref(c), appUrl()).toString() })),
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6" data-testid="topic-page">
      <PhoneHeader title={t.label} backHref="/explore" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="flex items-center gap-4 pb-5 pt-4 md:pt-12">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-hover text-foreground">
          <CategoryIcon category={slug} className="size-7" />
        </span>
        <div className="min-w-0">
          {t.group && <p className="text-caption font-medium uppercase tracking-wide text-muted">{t.group}</p>}
          <h1 className="text-title font-semibold tracking-tight">{t.label}</h1>
          <p className="mt-0.5 text-meta text-muted tabular-nums">
            {t.stats.collectors.toLocaleString("en-US")} {plural("collector", t.stats.collectors)} · {t.stats.items.toLocaleString("en-US")} {plural("item", t.stats.items)}
          </p>
        </div>
      </header>

      {t.related.length > 0 && <TopicChips topics={t.related} className="mb-7" />}

      {t.stats.items === 0 ? (
        <EmptyState
          icon={<CategoryIcon category={slug} />}
          title={`No ${t.label.toLowerCase()} yet`}
          description="Be the first to start a collection here. It shows up on this page for everyone."
          action={
            <LinkButton href={viewer ? `/u/${viewer.username}` : `/signup?next=${encodeURIComponent(`/topics/${slug}`)}`}>
              <Plus className="size-4" aria-hidden /> Start a collection
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-9">
          {t.collections.length > 0 && (
            <section aria-labelledby="topic-collections">
              <SectionHead id="topic-collections" title="Top collections" />
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
                {t.collections.slice(0, 6).map((c, i) => <CollectionCard key={c.id} c={c} eager={i < 2} />)}
              </div>
            </section>
          )}

          {t.collectors.length > 0 && <PeopleRow people={t.collectors} signedIn={signedIn} title="Top collectors" />}

          {t.items.length > 0 && (
            <section aria-labelledby="topic-recent">
              <SectionHead id="topic-recent" title="Recently added" />
              <ul className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
                {t.items.map((it, i) => (
                  <li key={it.id} className="relative min-w-0" data-testid="topic-item">
                    <Link href={`/i/${it.id}`} className="group block">
                      <div className="aspect-square overflow-hidden rounded-2xl">
                        <ItemThumb item={it} hint={{ category: slug, collection: it.collection }} eager={i < 4} className="transition-transform duration-300 group-hover:scale-[1.03]" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-meta font-semibold leading-snug">{it.title}</p>
                    </Link>
                    <div className="mt-0.5 min-w-0 text-caption text-muted">
                      <UserName user={it.user} label="username" size="sm" nameClassName="text-caption" />
                    </div>
                    <SaveButton itemId={it.id} savedByMe={it.savedByMe} signedIn={signedIn} variant="overlay" className="absolute right-0.5 top-0.5" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
