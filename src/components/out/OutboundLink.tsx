import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Every external item link goes through the /out interstitial: new tab, no referrer, no SEO credit. */
export const outHref = (itemId: string) => `/out/${itemId}`;

export function OutboundLink({ itemId, children, ...rest }: { itemId: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">) {
  return (
    <a href={outHref(itemId)} target="_blank" rel="noopener noreferrer nofollow ugc" {...rest}>
      {children}
    </a>
  );
}

/** X-style "edited" marker for a link changed after posting. */
export function LinkEditedLabel({ at, className }: { at?: string | null; className?: string }) {
  if (!at) return null;
  return (
    <span className={className} title={`Link changed ${new Date(at).toLocaleString()}`} data-testid="link-edited">
      Link edited
    </span>
  );
}
