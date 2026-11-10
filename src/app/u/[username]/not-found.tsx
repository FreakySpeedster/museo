import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl">🔎</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">We couldn’t find that collector</h1>
      <p className="mt-2 text-muted">Check the username and try again.</p>
      <LinkButton href="/" className="mt-6">Back home</LinkButton>
    </div>
  );
}
