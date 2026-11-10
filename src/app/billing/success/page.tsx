import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Welcome to Plus" };

export default async function Success() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{user.subscribed ? "You’re on Plus!" : "Almost there…"}</h1>
      <p className="mt-2 text-muted">
        {user.subscribed
          ? "Thanks for supporting Shelfie. You can now create as many pages as you like."
          : "We’re waiting for Stripe to confirm your payment. This usually takes a few seconds — refresh in a moment."}
      </p>
      <LinkButton href={`/u/${user.username}`} className="mt-6">Go to my shelves</LinkButton>
    </div>
  );
}
