# Architecture

Shelfie is a collection-showcase web app: people sign up, build pages of shelves, and fill those shelves with links (auto-previewed) or photos. Public profiles live at `/u/[username]`.

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4
- Prisma 6 on PostgreSQL (Neon / any Postgres). Runtime uses `DATABASE_URL` (pooled on serverless); migrations use `DIRECT_URL`
- UI: GSAP (`@gsap/react`), lucide-react icons, Geist fonts
- Validation: zod. Passwords: bcryptjs. Images: sharp
- Optional billing: Stripe Checkout + Customer Portal + webhooks
- Optional object storage: Vercel Blob (`@vercel/blob`). Otherwise local disk, or the `Asset` table on Vercel
- Tests: Vitest against a throwaway Postgres database. Playwright scripts for screenshots / e2e (not part of `npm test`)
- Hosting: Vercel, region `sin1` (`vercel.json`). Build: `npm run vercel-build` (`prisma generate && prisma migrate deploy && next build`)

## Folder map

```
prisma/schema.prisma          data model + migrations
src/app/                      App Router pages and route handlers
  page.tsx                    landing (signed out) or home feed (signed in)
  login/ signup/ pricing/     auth and billing UI
  billing/success/            post-checkout page
  u/[username]/               public profile (shelves + timeline)
  api/auth/*                  signup, login, logout
  api/me, api/me/avatar       current user + avatar upload
  api/pages, api/shelves, api/items
  api/preview, api/preview/image
  api/uploads/[name]          serves locally/DB-stored images
  api/feed, api/users/[username]/{follow,timeline}
  api/billing/*               checkout, portal, webhook, demo-upgrade
  api/admin/backfill-thumbnails
src/components/               landing, feed, profile, UI primitives, motion
src/lib/                      shared server/client libraries
  auth.ts, db.ts, env.ts, api.ts, validation.ts, errors.ts
  services/                   domain logic + authorization
  net/                        SSRF guard, safe fetch, HTML/OG parsing
  link-preview.ts, uploads.ts, storage.ts
  rate-limit.ts, locks.ts, limits.ts, stripe.ts
scripts/                      seed, extract-cli, preview-testset, e2e, screenshots
tests/                        Vitest unit/integration tests
public/seed/                  seeded SVG artwork
/workspace/tools/deploy.py    Vercel deploy helper (not in this repo)
```

Business rules in `src/lib/limits.ts` and `src/lib/services/items.ts`: 5 shelves per page, 1 free page (then paywall), 25 pages max, 200 items per shelf. Page/shelf mutations take a Postgres advisory transaction lock (`src/lib/locks.ts`) so limits stay correct on serverless.

## Data model

From `prisma/schema.prisma` (PostgreSQL). Category and item `type` are validated strings, not Prisma enums.

- **User** — `email` and `username` unique; `displayName`, `bio`, optional `avatarUrl`; `passwordHash`. Billing: `subscribed`, `subscriptionStatus` (`none | active | past_due | canceled | demo`), optional unique `stripeCustomerId` / `stripeSubscriptionId`.
- **Session** — `tokenHash` (SHA-256 of the cookie token), `userId`, `expiresAt`. Indexed on `userId`.
- **Page** — belongs to a user; `title`, `description`, `position`. Indexed on `(userId, position)`.
- **Shelf** — belongs to a page; `name`, `category`, `position`. Indexed on `(pageId, position)`.
- **Item** — belongs to a shelf and a user; `type` is `LINK` or `PHOTO`; optional `url`, `imageUrl`, `faviconUrl`, `siteName`; `title`, `description`, `position`. Indexed on `(shelfId, position)`, `(userId, createdAt)`, `createdAt`.
- **Follow** — composite id `(followerId, followingId)`.
- **RateLimit** — `key`, `count`, `windowStart`. Shared fixed-window limiter state for serverless.
- **Asset** — `name` (id), `contentType`, `data` (bytes), `size`. Used when images are stored in the database.

Cascades: deleting a user removes sessions, pages, items, and follows; deleting a page removes its shelves; deleting a shelf removes its items.

## Image and link-preview pipeline

### Storage

`src/lib/storage.ts` picks a driver:

1. `BLOB_READ_WRITE_TOKEN` set — Vercel Blob (public URLs).
2. Else if running on Vercel, or `STORAGE_DRIVER=db` — compact images in the `Asset` table, served at `/api/uploads/[name]`.
3. Else — local disk under `UPLOAD_DIR` (default `./uploads`), same URL prefix.

`src/lib/uploads.ts` never trusts client MIME/filenames. Magic-byte sniffing allows JPEG/PNG/WebP/GIF (ICO only where explicitly allowed). Raster uploads are auto-rotated, resized (max 1600px, avatars 512px square, remote thumbs 900px), re-encoded to WebP, and stripped of EXIF. Animated GIFs are kept as-is after a decode check. Filenames are 32 hex chars plus an extension.

`GET /api/uploads/[name]` (`src/app/api/uploads/[name]/route.ts`) only serves names matching that pattern, with long immutable cache headers and a tight `Content-Security-Policy`.

### Link preview

Pasting a link hits `GET /api/preview` (`maxDuration` 45s, auth + rate limit). The pipeline is `resolveLinkPreview` in `src/lib/link-preview.ts`, with HTML parsing in `src/lib/net/og.ts` and fetching in `src/lib/net/safe-fetch.ts`.

`safeFetch` allows only http(s), rejects credentials, resolves DNS, refuses non-public IPs (loopback, private, link-local including cloud metadata, reserved, multicast — `src/lib/net/ip-guard.ts`), pins the TCP connection to the vetted IP (anti-rebinding), re-validates redirects, and enforces timeout and byte caps. `SSRF_ALLOW_CIDRS` is an operator escape hatch and should stay empty in production.

Preview steps:

1. Fetch the page with a chain of identities (WhatsApp, Facebook, Twitter, Slack, then Chrome) so shops that only give crawlers rich `og:` tags still work. Bot-wall titles are skipped.
2. Collect image candidates: Open Graph, Twitter, JSON-LD, microdata, `image_src`, preload, body/`srcset` galleries, Shopify product `.json`, oEmbed (including YouTube), AMP pages, and site-specific URL rewrites (Amazon, Shopify, Flipkart, Myntra). Last resorts: noembed.com and a keyless Microlink unfurl. A 22s deadline bounds the gather phase.
3. Normalise URLs (entities, relative/protocol-relative, https upgrade, tiny CDN renditions bumped to a large size). Deduplicate, then download and measure candidates with sharp (3 at a time). Tiny, extreme-aspect, icon-like, SVG, and ICO images are ranked down. The add form gets inline WebP data-URI thumbs plus alternatives.
4. On save (`POST /api/shelves/[id]/items`, `type=LINK`), `resolveThumbnail` caches the chosen or best image (and favicon) through the storage adapter. If every download fails, it keeps a remote `https` URL so the card can still hot-link. The owner can pick a candidate, upload their own photo, or later refresh via `/api/items/[id]/thumbnail`.
5. `GET /api/preview/image` is a same-origin, SSRF-guarded, auth-only proxy that returns a 480px WebP (for shops that block hot-linking).
6. Previews are cached in a process-local `Map` for 3 minutes (not shared across serverless instances).
7. Operators can re-run extraction with `POST /api/admin/backfill-thumbnails` (`Authorization: Bearer` plus `CRON_SECRET`, 16+ characters).

## Auth

Custom sessions, not a third-party auth provider (`src/lib/auth.ts`, `src/lib/services/accounts.ts`).

- Signup/login: zod schemas (`src/lib/validation.ts`); passwords hashed with bcrypt (cost 11). Login uses a dummy hash when the email is unknown, to avoid timing oracles. Usernames are 3–20 `[a-z0-9_]`, with a reserved-name list.
- Session cookie `shelfie_session`: 256-bit random token, SHA-256 stored in `Session`, `HttpOnly; SameSite=Lax; Path=/`, `Secure` when `APP_URL` (or the Vercel fallback) is https. Lifetime 30 days. There is no session secret env var. `getCurrentUser` is React-`cache`d per request.
- Mutating requests go through `route()` in `src/lib/api.ts`: same-origin `Origin` check (non-GET), optional auth, uniform JSON errors, optional Postgres-backed fixed-window rate limits (`src/lib/rate-limit.ts`) keyed by user id or client IP.
- Stripe Checkout (`STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`) creates a subscription; `/api/billing/webhook` verifies `STRIPE_WEBHOOK_SECRET` and updates the user. If those keys are unset, a labelled demo upgrade (`POST /api/billing/demo-upgrade`) just flags the account as subscribed; that route is disabled once Stripe is configured.
- New accounts get one free page, "My Collections".

## Deploy

Production deploys are done with:

```
python3 /workspace/tools/deploy.py production
```

(`production` is also the default target if the argument is omitted.)

The script is outside this repo. It:

1. Reads `VERCEL_TOKEN` from the environment (the only secret it uses). Team and project identifiers are hardcoded in the script.
2. Walks `/workspace/shelfie`, skipping `.git`, `.vercel`, `node_modules`, `.next`, and every pattern in `.vercelignore` (including `.env*`, `uploads/`, `screenshots/`, `tests/`, logs, and tsbuildinfo).
3. POSTs each remaining file to the Vercel file API with a SHA-1 digest, then creates a new deployment (`forceNew=1`) for project `shelfie`, `target` as given, framework `nextjs`, build command `npm run vercel-build`.
4. Prints id / url / readyState (or an error) and writes the deployment id to `/workspace/last_deploy_id`.

`vercel-build` generates the Prisma client, applies migrations via `DIRECT_URL`, then builds the Next app. This script uploads the current working tree; it does not push git and it will include uncommitted files that are not ignored. Do not run it unless a production deploy is explicitly requested.

## Environment variables

Names only. Full comments live in `.env.example`. Never commit values.

Required:

- `DATABASE_URL` — Postgres runtime connection (pooled URL on serverless)
- `DIRECT_URL` — direct (non-pooled) URL for `prisma migrate` (same as `DATABASE_URL` if there is no pooler)

Storage and uploads:

- `BLOB_READ_WRITE_TOKEN` — Vercel Blob; recommended on Vercel. Empty: local disk in dev, `Asset` table on Vercel
- `STORAGE_DRIVER` — set to `db` to force database storage off Vercel
- `UPLOAD_DIR` — local-disk directory (default `./uploads`)
- `MAX_UPLOAD_MB` — server-side image size limit in MB (default 8)

App and operations:

- `APP_URL` — public base URL (Stripe redirects, `Secure` cookie). On Vercel, falls back to `VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`
- `CRON_SECRET` — 16+ chars; enables the backfill endpoint
- `SSRF_ALLOW_CIDRS` — comma-separated CIDRs allowed past the SSRF blocklist; leave empty in production

Stripe (all optional; empty enables demo-mode upgrade):

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `PLUS_PRICE_LABEL` — display text only (default `$4 / month`)

Tests, seed, and deploy:

- `TEST_DATABASE_URL` — throwaway Postgres for `npm test` (name must contain `test`; schema is dropped each run). Default in `vitest.config.mts` is `localhost:5433/shelfie_test`
- `ALLOW_SEED` — must be `1` to run the demo seed when `NODE_ENV=production`
- `VERCEL_TOKEN` — used only by `/workspace/tools/deploy.py`, not by the Next app

Platform-provided (not set in `.env.example`): `NODE_ENV`, `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`.
