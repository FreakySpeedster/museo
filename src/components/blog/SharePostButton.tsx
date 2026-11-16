"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function SharePostButton({ title }: { title: string }) {
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        const url = window.location.href.split("?")[0];
        if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* fall back to copy */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        } catch {
          toast.info(url);
        }
      }}
    >
      <Link2 className="size-4" aria-hidden /> Share
    </Button>
  );
}
