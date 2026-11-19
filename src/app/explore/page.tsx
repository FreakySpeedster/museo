import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { exploreChips, exploreItems } from "@/lib/services/explore";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExploreView } from "@/components/explore/ExploreView";

export const metadata: Metadata = { title: "Explore", description: "What people are collecting on Museo, ranked by how many own it." };

/** Public Explore (signed-out visitors and deep links). Signed-in people get it as a tab on Home. */
export default async function ExplorePage() {
  const viewer = await getCurrentUser();
  if (viewer) redirect("/?tab=explore");
  const [{ chips }, initial] = await Promise.all([exploreChips(null), exploreItems({ chip: "trending" })]);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
      <PageHeader title="Explore" description="What people are collecting, ranked by how many own it." className="!mb-3" />
      <ExploreView chips={chips} initial={initial} />
    </div>
  );
}
