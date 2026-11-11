# nook

**Show off what you collect.** nook is a social showcase app: build *pages*, stock them with *shelves*
(each shelf holds one category), and drop in links or photos. Everything you add also lands on your public
**timeline**, and in the home feed of people who follow you.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL · GSAP**.

![landing](screenshots/01-landing.png)

## Features

- **Pages > Shelves > Items.** A person has pages; a page has up to **5 shelves** (enforced on the server *and* in the UI);
  each shelf has a name and one category; shelves hold items.
- **Add a link or a photo**, with a title and optional description.
  - Links: the page's `og:image` / `twitter:image` / `image_src` / first large `<img>` / favicon becomes the thumbnail
    (cached locally so cards never break); title & description are pre-filled from the page when left blank.
    A live preview appears in the dialog as you paste.
  - Photos: JPG/PNG/WebP/GIF up to 8 MB, validated by content (magic bytes), re-encoded (EXIF/GPS stripped) and stored under `UPLOAD_DIR`.
- **Timeline** on every profile (chronological, grouped by day, infinite "load older") + a **home feed** (Following / Everyone).
- **Page switcher** at the top of a profile; the URL keeps the selected page (`/u/name?page=…`).
- **Paywall:** the first page is free; extra pages need **nook Plus**. Stripe Checkout + webhook when configured,
  otherwise a clearly-labelled **demo mode** upgrade.
- **Public profiles** at `/u/[username]`, follow/unfollow, edit profile, edit/delete items, shelves and pages,
  drag-to-reorder items (plus = to buttons for touch & keyboard).
- Dark mode, responsive/mobile-first, empty states, loading skeletons, toasts, error & 404 pages, accessible dialogs.
- **GSAP animation** (all respecting `prefers-reduced-motion`): hero text/collage with mouse parallax, page transitions,
  ScrollTrigger reveals for shelves/items/timeline (scrubbed timeline line), **Flip** for reorder/add/remove,
  3D hover **tilt** on cards, elastic page-switcher indicator, a satisfying add-item pop + confetti burst, animated modals & toasts.

## Quick start

Requires Node 20+ (tested on Node 24) and a PostgreSQL database (local Postgres, Docker, or a free Neon project).

```bash
docker run -d --name shelfie-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17   # or any Postgres
docker exec shelfie-pg createdb -U postgres shelfie && docker exec shelfie-pg createdb -U postgres shelfie_test

npm install                 # also runs `prisma generate`
cp .env.example .env        # defaults match the docker command above
npm run db:setup            # prisma migrate deploy + seed demo data
npm run dev                 # http://localhost:3000
```

Production-style: `npm run build && npm run start`.

### Demo accounts (created by the seed)

| Email | Password | Notes |
|---|---|---|
| `demo@shelfie.app` | `demo1234` | free plan, 1 page, 4 shelves — try the paywall |
| `maya@shelfie.app` | `maya1234` | Plus, 2 pages (page switcher) |
| `kenji@shelfie.app` | `kenji1234` | free plan |

Seed images are generated SVG placeholders in `public/seed/`, so the demo looks right fully offline.
Re-running `npm run db:seed` resets just those three users.

## Environment variables

See [`.env.example`](.env.example) (every variable is documented there). Nothing secret is hard-coded.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres runtime connection (use the *pooled* URL on serverless). |
| `DIRECT_URL` | **yes** | Direct (non-pooled) URL for `prisma migrate`. Same value as `DATABASE_URL` if you have no pooler. |
| `BLOB_READ_WRITE_TOKEN` | **yes on Vercel** | Optional on Vercel: enables Vercel Blob for photos, avatars and cached link thumbnails. Empty > local disk (dev) or the database (Vercel). |
| `CRON_SECRET` | optional | 16+ char secret that enables `POST /api/admin/backfill-thumbnails` (send `Authorization: Bearer <secret>`) to fill in missing link thumbnails. |
| `STORAGE_DRIVER` | optional | Set to `db` to keep images in the database (Asset table) even off Vercel. |
| `APP_URL` | recommended | Public base URL (Stripe redirects, cookie `Secure` flag). Falls back to `VERCEL_PROJECT_PRODUCTION_URL`. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | optional | Real subscriptions. All empty > clearly-labelled demo-mode upgrade. |
| `PLUS_PRICE_LABEL` | optional | Display text for the price (default `$4 / month`). |
| `MAX_UPLOAD_MB` | optional | Server image size limit (default 8). |
| `UPLOAD_DIR` | local only | Local-disk upload directory (default `./uploads`). |
| `SSRF_ALLOW_CIDRS` | optional | Escape hatch for networks that map public DNS into a reserved range. Leave empty in production. |
| `TEST_DATABASE_URL` | tests | Throwaway Postgres DB for `npm test` (name must contain `test`; schema is dropped each run). |
| `ALLOW_SEED` | seeding | Needed to run the demo seed when `NODE_ENV=production`. |

There is **no session secret**: sessions are random 256-bit tokens stored hashed in Postgres.

### Subscriptions: Stripe vs demo mode

- **Stripe configured** (`STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`): "Upgrade" creates a Stripe Checkout Session
  (`POST /api/billing/checkout`). Point a Stripe webhook at **`/api/billing/webhook`** and subscribe to
  `checkout.session.completed`, `customer.subscription.created|updated|deleted`; set `STRIPE_WEBHOOK_SECRET`.
  Signatures are verified; access follows the subscription status. Local testing: `stripe listen --forward-to localhost:3000/api/billing/webhook`.
- **Not configured > demo mode:** the upgrade button is labelled *Demo mode* and just flags the account as subscribed
  (`POST /api/billing/demo-upgrade`, which is **disabled automatically once Stripe is configured**).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js (`build` = `prisma generate && next build`) |
| `npm run vercel-build` | What Vercel runs: `prisma generate && prisma migrate deploy && next build` |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm test` | Vitest (shelf limit & races, paywall, SSRF guard, OG parsing, authorization, uploads, storage adapter, DB rate limiter, Stripe webhook logic) on a throwaway Postgres database |
| `npm run e2e` | HTTP end-to-end script against a running server (`BASE_URL`, default `localhost:3000`) |
| `npm run screenshots` | Playwright (headless Chromium) UI flow + screenshots into `screenshots/` |
| `npm run db:migrate` · `db:seed` · `db:setup` | Prisma migrate deploy · seed · both |

For the Playwright scripts: `npx playwright install chromium` once.

## Architecture

```
prisma/schema.prisma        User, Session, Page, Shelf, Item, Follow (enums are validated strings)
src/lib/limits.ts           business rules: 5 shelves/page, 1 free page (pure functions)
src/lib/services/*          domain logic + authorization (accounts, pages, shelves, items, feed, billing, profile)
src/lib/net/ip-guard.ts     SSRF: blocklist of private/loopback/link-local/reserved ranges (v4 + v6 + mapped)
src/lib/net/safe-fetch.ts   SSRF-safe fetch: http(s) only, DNS-resolved + pinned IP, redirects re-validated, timeout, byte cap
src/lib/net/og.ts           og:image / twitter:image / first-large-img / favicon parsing (cheerio)
src/lib/uploads.ts          magic-byte validation, sharp re-encode, random filenames
src/app/api/**              JSON route handlers (zod validation, origin check, rate limits)
src/components/**           UI (profile/, feed/, landing/, ui/, motion/)
```

Security notes: passwords hashed with bcrypt; sessions are random 256-bit tokens stored **hashed** in the DB, sent as
`HttpOnly; SameSite=Lax` cookies (`Secure` on https); mutating requests require a same-origin `Origin`; all input is
validated with zod; every mutation checks ownership server-side; uploads are re-encoded images only;
auth/preview/create endpoints are rate limited with a **Postgres-backed** fixed-window limiter, and the shelf/page limits
are race-free thanks to **Postgres advisory transaction locks** — both are safe on serverless with any number of instances.

## Link previews (how the product photo is chosen)

Pasting a link runs one pipeline (`src/lib/link-preview.ts`, parser in `src/lib/net/og.ts`):

1. Fetch the page as WhatsApp, facebookexternalhit, Twitterbot, Slackbot and finally Chrome (many shops only serve rich `og:` tags to crawlers). Redirects/short links (amzn.in, bit.ly) are followed, SSRF-guarded.
2. Collect every image source: `og:image(:secure_url/:url)`, `twitter:image(:src)`, JSON-LD (`Product`, `ImageObject`, `@graph`, arrays), microdata, `link rel=image_src`, preload hints, Shopify `.json`, oEmbed discovery, AMP page, `srcset`/`data-src` gallery images, plus site hooks (Amazon `landingImage`, Flipkart, Myntra, Nykaa, Ajio, YouTube `maxresdefault`). Last resort: noembed.com and a keyless unfurl service.
3. Normalise urls (entities, relative/protocol-relative, Shopify `{width}`, tiny Amazon/Flipkart/Myntra renditions upgraded), then **download and measure** candidates, rejecting logos/icons/svg/tiny images and preferring product photos.
4. The add form shows a live card (skeleton, auto-filled title, inline thumbnails to pick from). "My photo" accepts a file, camera (phones), drag-and-drop or paste; owners can later change the photo, refresh from the link, or revert.

Sites that block datacenter IPs (Flipkart, Myntra, Etsy, Ajio from Vercel) can still fall back to the owner's own photo. `npx tsx scripts/extract-cli.ts [url ...]` runs the pipeline locally; `scripts/preview-testset.ts` replays the 17-URL test set against a deployment. Operator backfill: `POST /api/admin/backfill-thumbnails` with `Authorization: Bearer $CRON_SECRET` and `{"scope":"all"|"missing","limit":5,"after":"<id>"}`.

## Deploying to Vercel (Postgres + Blob + Stripe)

1. **Database:** create a Postgres database (Vercel Marketplace > Neon, or any Postgres). Set `DATABASE_URL` (pooled) and
   `DIRECT_URL` (direct). With the Vercel-Neon integration map: `DATABASE_URL` = `POSTGRES_PRISMA_URL`/`POSTGRES_URL`, `DIRECT_URL` = `POSTGRES_URL_NON_POOLING`.
2. **Storage:** Project > Storage > create a **Blob** store and connect it; `BLOB_READ_WRITE_TOKEN` is added automatically.
   (Optional: without it, nook stores re-encoded images in the database `Asset` table, so uploads, avatars and thumbnails still work.) Seed images ship in `public/seed/`.
3. **Import the repo** in Vercel (framework: Next.js). The `vercel-build` script runs `prisma migrate deploy` on every deploy, so the schema
   is migrated automatically using `DIRECT_URL`. No `vercel.json` is needed. `postinstall` runs `prisma generate`.
4. Set `APP_URL` to your production URL/custom domain (optional on `*.vercel.app`).
5. **Stripe (optional):** set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (a recurring price), create a webhook endpoint
   `https://<your-domain>/api/billing/webhook` listening to `checkout.session.completed` and `customer.subscription.created|updated|deleted`,
   and set `STRIPE_WEBHOOK_SECRET`. Leave all three empty to ship the demo-mode upgrade.
6. **Demo data (optional):** `ALLOW_SEED=1 NODE_ENV=production DATABASE_URL=… DIRECT_URL=… npm run db:seed` from your machine. Don't seed public demo passwords into a real production DB.

Notes: Vercel limits request bodies to 4.5 MB, so the browser downscales big photos before upload (GIFs must be < 4 MB).
Link previews run inside the `/api/shelves/[id]/items` function (`maxDuration = 30`).
