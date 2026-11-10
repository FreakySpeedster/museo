import path from "node:path";

/** Public base URL. APP_URL wins; on Vercel we fall back to the production/preview hostname. */
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR || "./uploads";
  return path.isAbsolute(dir) ? dir : path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || 8);
  return Math.max(1, Number.isFinite(mb) ? mb : 8) * 1024 * 1024;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function isSecureDeployment(): boolean {
  return appUrl().startsWith("https://");
}
