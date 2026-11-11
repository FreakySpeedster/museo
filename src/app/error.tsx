"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <TriangleAlert className="size-10 text-accent" aria-hidden strokeWidth={1.4} />
      <h1 className="mt-4 text-title font-semibold tracking-tight">Something tipped over</h1>
      <p className="mt-2 text-body text-muted">We hit an unexpected error. Please try again.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
