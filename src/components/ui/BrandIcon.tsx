import type { SocialNetworkId } from "@/lib/social-links";

/** Monochrome brand marks (simple-icons paths) plus a globe for websites. */
const PATHS: Record<SocialNetworkId, { path: string; label: string }> = {
  website: {
    label: "Website",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 1.6a8.4 8.4 0 0 1 7.7 5.2H15.3A16 16 0 0 0 12 3.6Zm-1.5 0v5.2H4.3A8.4 8.4 0 0 1 10.5 3.6ZM3.6 12c0-.5.04-1 .12-1.5h6.78v3H3.72A8.5 8.5 0 0 1 3.6 12Zm7 1.5v5.2a8.4 8.4 0 0 1-6.3-5.2H10.6Zm1.4 5.2v-5.2h6.3a8.4 8.4 0 0 1-6.3 5.2Zm6.28-6.7H13.5v-3h6.78c.08.5.12 1 .12 1.5s-.04 1-.12 1.5ZM13.5 8.8V3.6a8.4 8.4 0 0 1 6.2 5.2H13.5Z",
  },
  instagram: {
    label: "Instagram",
    path: "M8.5 3h7A5.5 5.5 0 0 1 21 8.5v7A5.5 5.5 0 0 1 15.5 21h-7A5.5 5.5 0 0 1 3 15.5v-7A5.5 5.5 0 0 1 8.5 3Zm0 1.6A3.9 3.9 0 0 0 4.6 8.5v7a3.9 3.9 0 0 0 3.9 3.9h7a3.9 3.9 0 0 0 3.9-3.9v-7a3.9 3.9 0 0 0-3.9-3.9h-7ZM17.2 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Z",
  },
  x: {
    label: "X",
    path: "M14.6 4h2.8l-6.1 7 7.2 9h-5.6l-4.4-5.8L4.2 20H1.4l6.6-7.5L1.2 4h5.7l4 5.3L14.6 4Zm-1 14.4h1.6L6.6 5.5H5L13.6 18.4Z",
  },
  youtube: {
    label: "YouTube",
    path: "M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.2V8.8L15.6 12 10 15.2Z",
  },
  tiktok: {
    label: "TikTok",
    path: "M14.2 3h2.5c.2 2.2 1.5 3.9 3.6 4.2v2.5c-1.3 0-2.5-.4-3.6-1.1v6.3A6.4 6.4 0 1 1 9.2 8.7v2.7a3.9 3.9 0 1 0 3.1 3.8V3Z",
  },
};

/** Brand accent per network. X and TikTok stay foreground-coloured (their marks are mono); Instagram uses its gradient. */
const COLORS: Partial<Record<SocialNetworkId, string>> = {
  website: "#4F8CFF",
  youtube: "#FF0033",
  tiktok: "#25F4EE",
};

export function BrandIcon({ network, className = "size-4", brand = false }: { network: string; className?: string; brand?: boolean }) {
  const id = (network in PATHS ? network : "website") as SocialNetworkId;
  const def = PATHS[id];
  const gradId = "brand-ig-grad";
  const fill = brand ? (id === "instagram" ? `url(#${gradId})` : COLORS[id] ?? "currentColor") : "currentColor";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill={fill}>
      {brand && id === "instagram" && (
        <defs>
          <radialGradient id={gradId} cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#FDF497" />
            <stop offset="10%" stopColor="#FDF497" />
            <stop offset="50%" stopColor="#FD5949" />
            <stop offset="68%" stopColor="#D6249F" />
            <stop offset="100%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
      )}
      {brand && id === "youtube" ? (
        <>
          <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8Z" />
          <path d="M10 15.2V8.8L15.6 12 10 15.2Z" fill="#fff" />
        </>
      ) : brand && id === "tiktok" ? (
        <>
          <path d={def.path} fill="#FE2C55" transform="translate(0.8 0.6)" />
          <path d={def.path} fill="#25F4EE" transform="translate(-0.6 -0.5)" />
          <path d={def.path} fill="currentColor" />
        </>
      ) : (
        <path d={def.path} />
      )}
    </svg>
  );
}

export function brandLabel(network: string) {
  return PATHS[network as SocialNetworkId]?.label ?? "Link";
}
