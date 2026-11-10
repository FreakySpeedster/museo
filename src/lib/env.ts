import path from "node:path";

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
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
