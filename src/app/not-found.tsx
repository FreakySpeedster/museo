import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <SearchX className="size-10 text-accent" aria-hidden strokeWidth={1.4} />
      <h1 className="mt-4 text-title font-semibold tracking-tight">Nothing on this shelf</h1>
      <p className="mt-2 text-body text-muted">The page you’re looking for doesn’t exist or was moved.</p>
      <LinkButton href="/" className="mt-6">Back home</LinkButton>
    </div>
  );
}
