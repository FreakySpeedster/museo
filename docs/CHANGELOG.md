# Changelog

All notable work on Shelfie, summarized from `git log`. Dates are Asia/Calcutta (UTC+5:30). Newest first. There are no release tags yet; history lives on local `master` only.

## Unreleased

- Sticky profile chrome: shelves/timeline tabs and the page switcher pin just below the app navbar. Once the profile header leaves the viewport, a compact identity (avatar, display name, @handle) slides in on the same row with no height change. Opaque frosted background, horizontal tab scroll on small screens, IntersectionObserver-driven reveal.

## 2026-11-11 — a2b4204

docs: add `docs/ARCHITECTURE.md` and this changelog.

## 2026-11-11 — deaa2c3

Scroll own photo into view, README link-preview docs, remove arrow glyphs.

- `PhotoPicker` scrolls a newly chosen “own photo” into view in the add-item flow.
- README documents the link-preview pipeline (crawler UA chain, candidate sources, measurement, owner-photo fallback, backfill).
- Remove leftover arrow glyphs from the UI.
- Refresh live desktop/mobile screenshots of the add flow, profile, and landing.

## 2026-11-11 — 4787cd6

Detect bot-wall titles, test-set script tweaks.

- Skip challenge / maintenance / login-wall titles in `src/lib/net/og.ts` so crawler fetches of blocked pages are not treated as the product.
- Small preview test-set script and `.env.example` tweaks; tests in `tests/og.test.ts`.

## 2026-11-11 — 8c91b68

Exhaustive link-preview extraction, seamless add flow with candidate picker and own photo, mobile polish.

- Expand `link-preview.ts` / `og.ts`: multi-identity fetch, JSON-LD and site hooks, Shopify `.json`, oEmbed, AMP, noembed/Microlink fallbacks, download-and-measure ranking, inline thumbs.
- Add-item dialog and new `PhotoPicker`: live preview, candidate picker, own photo (file, camera, drag-and-drop, paste).
- `GET /api/preview/image` same-origin thumbnail proxy; item create and `/api/items/[id]/thumbnail` accept a chosen candidate or an owner photo.
- Mobile polish (`scripts/mobile.ts`, modal/toast tweaks), extract CLI, 17-URL preview test set, local screenshots, more OG tests.

## 2026-11-10 — 82f7fcf

Fix link thumbnails (browser UA, JSON-LD/Shopify fallbacks, DB asset storage, remote fallback, backfill), avatars, category picker, replace emoji with lucide icons.

- More robust thumbnail extraction and a remote-https fallback when caching fails.
- `Asset` table + storage adapter path for DB-backed images; avatar upload (`/api/me/avatar`, `AvatarEditor`); operator `POST /api/admin/backfill-thumbnails`.
- Category picker with lucide-react icons (emoji removed from the product UI).
- Prisma migration `20261110170000_avatar_assets_drop_emoji`; category/avatar tests.

## 2026-11-10 — af0d454

Live deployment: `.vercelignore`, live screenshots.

- Add `.vercelignore` so deploys omit `node_modules`, `.next`, `.env*`, uploads, screenshots, tests, and logs.
- Capture live landing, profile, and timeline screenshots.

## 2026-11-10 — 71a26be

Deploy prep: `vercel.json` (sin1), drop demo-only links from landing/home.

- Pin Vercel region to `sin1`.
- Remove demo-only links from the landing page and signed-in home.

## 2026-11-10 — 63f131d

Production-ready for Vercel: Postgres, Blob storage adapter, DB-backed rate limits and locks.

- Switch the data store to PostgreSQL (`DATABASE_URL` / `DIRECT_URL`); replace in-memory mutex/rate limits with `RateLimit` plus advisory locks (`src/lib/locks.ts`).
- Introduce the storage adapter (`src/lib/storage.ts`): Vercel Blob, database, or local disk. Browser-side downscale before upload (`src/lib/client-image.ts`).
- `vercel-build` runs `prisma migrate deploy`. Infra tests for the storage driver and rate limiter.

## 2026-11-10 — 1cd264f

Shelfie: collection showcase app (Next.js, Prisma, GSAP).

- Initial app: App Router pages, Prisma schema, auth, pages/shelves/items, follow/feed/timeline, link preview, uploads, Stripe + demo billing, seed data, Vitest tests, screenshot and e2e scripts, README.
