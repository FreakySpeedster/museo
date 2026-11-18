import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, } from "@/lib/auth";
import { getProfile } from "@/lib/services/profile";
import { stripeConfigured } from "@/lib/env";
import { toViewerDTO } from "@/lib/mappers";
import { ProfileView } from "@/components/profile/ProfileView";
import { db } from "@/lib/db";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string; item?: string; view?: string; edit?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { displayName: true, username: true, bio: true } });
  if (!u) return { title: "Not found" };
  return {
    title: `${u.displayName} (@${u.username})`,
    description: u.bio || `Browse ${u.displayName}'s collections on nook.`,
    openGraph: { title: `${u.displayName}'s collections`, description: u.bio || "Collections on nook" },
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ username }, sp, viewer] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (sp.view === "timeline" && viewer?.username === username.toLowerCase()) redirect("/timeline");
  const profile = await getProfile(username, viewer?.id);
  if (!profile) notFound();
  return (
    <ProfileView
      key={profile.user.id}
      profile={profile}
      viewer={viewer ? toViewerDTO(viewer) : null}
      stripeEnabled={stripeConfigured()}
      priceLabel={process.env.PLUS_PRICE_LABEL || "$4 / month"}
      initialPageId={sp.page}
      initialItemId={sp.item}
      initialEdit={sp.edit === "1"}
    />
  );
}
