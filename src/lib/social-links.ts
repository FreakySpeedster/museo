export const SOCIAL_NETWORKS = [
  { id: "website", label: "Website" },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com", "www.instagram.com"] },
  { id: "x", label: "X", hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"] },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"] },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]["id"];
export type SocialLink = { network: SocialNetworkId; url: string };

const byId = new Map(SOCIAL_NETWORKS.map((n) => [n.id, n]));

export function parseSocialUrl(raw: string, network: SocialNetworkId): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Enter a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Links must start with https://");
  const def = byId.get(network);
  const hosts = def && "hosts" in def ? (def as { hosts?: readonly string[] }).hosts : undefined;
  if (hosts && !hosts.includes(url.hostname.toLowerCase())) {
    throw new Error(`Use a ${def?.label ?? "valid"} URL`);
  }
  url.hash = "";
  return url.toString();
}

export function normalizeSocialLinks(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return [];
  const out: SocialLink[] = [];
  const seen = new Set<string>();
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const network = (row as { network?: string }).network;
    const url = (row as { url?: string }).url;
    if (!network || !byId.has(network as SocialNetworkId) || typeof url !== "string") continue;
    const parsed = parseSocialUrl(url, network as SocialNetworkId);
    if (!parsed || seen.has(network)) continue;
    seen.add(network);
    out.push({ network: network as SocialNetworkId, url: parsed });
  }
  return out;
}
