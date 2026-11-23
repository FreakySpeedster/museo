/** A post-login return path we can trust: same-origin, path-only (no "//host" or "/\host" tricks). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || next.length > 512) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(next)) return null;
  return next;
}

export const loginHref = (returnTo: string) => `/login?next=${encodeURIComponent(returnTo)}`;
