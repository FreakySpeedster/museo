# Shelfie design system

Use these tokens and primitives for every new screen and component. Do not invent one-off colours, type sizes, or control heights.

## Principles

- Collections are the product. Chrome stays quiet. Motion is short opacity and small-Y fades — no bounce, elastic, tilt, or confetti.
- The public website (landing, pricing, log in, sign up, and logged-out profiles) is minimal and professional: a simple top bar, generous whitespace, typographic hierarchy, and a single restrained accent. The signed-in app keeps the sidebar.
- One token language on every surface — marketing, app, dialogs, empty states — so a later feature (search, notifications, create, likes) can drop in without a redesign.
- No emojis. Icons come from `lucide-react` at 16, 20 or 24px (`size-4`, `size-5`, `size-6`). Decorative empty-state marks may be 40px (`size-10`).
- No native-looking form controls. Inputs, the category combobox and tabs all share the same chrome.
- Colour contrast meets WCAG AA (4.5:1) for text, including muted copy and accent-as-text, in light and dark.

## Tokens

Source of truth: `src/app/globals.css`. Roles are CSS variables, wired into Tailwind via `@theme`.

### Colour

| Role | CSS | Tailwind | Use |
|---|---|---|---|
| background | `--background` | `bg-background` | Page canvas |
| surface | `--surface` | `bg-surface` | Cards, shelves |
| surface-raised | `--surface-raised` | `bg-surface-raised` | Modals, menus, toasts |
| surface-hover | `--surface-hover` | `bg-surface-hover` | Hover fills, subtle wells |
| border | `--border` | `border-border` | Dividers and strokes |
| text | `--foreground` | `text-foreground` | Primary copy |
| text-muted | `--muted` | `text-muted` | Meta, hints, placeholders |
| accent | `--accent` | `bg-accent` `text-accent` | Brand, primary actions, links |
| accent-contrast | `--accent-contrast` | `text-accent-contrast` | Text/icons on accent fills |
| accent-subtle | `--accent-subtle` | `bg-accent-subtle` | Soft accent tints |
| danger / success / warning / info | `--danger` etc. | `text-danger` `bg-danger-subtle` … | Status |
| focus | `--focus` | `outline-focus` `ring-focus` | Focus rings |

The canvas is a warm off-white (`#FAFAF8`) in light and near-black (`#0C0C0B`) in dark, with a single restrained coral accent. Light accent (`#C83819`) stays AA on the canvas and as white-on-fill. Dark accent is a brighter coral (`#FF7A52`) with dark ink as contrast. Decorative gold (`--gold`) is reserved for rare highlights, never body text. Do not add background blobs, confetti, or candy gradients.

### Type

Fluid headings, fixed body sizes. Minimum readable size is 12px.

| Style | Class | Size | Line-height | Weight |
|---|---|---|---|---|
| Display | `text-display` | clamp 36–64px | 1.05 | 600 |
| Title | `text-title` | clamp 28–40px | 1.15 | 600 |
| Heading | `text-heading` | clamp 20–24px | 1.25 | 600 |
| Lede | `text-lede` | 18px | 1.6 | 400 |
| Body | `text-body` | 16px | 1.5 | 400 |
| Meta | `text-meta` | 14px | 1.45 | 400–500 |
| Caption | `text-caption` | 13px | 1.4 | 400 |
| Micro | `text-micro` | 12px | 1.35 | 500–600 |

Body copy is 16px everywhere, including inputs (prevents iOS zoom). Use meta or caption for timestamps, counts and supporting UI — not micro, except badges, overlines and the phone tab labels.

The typeface is Geist (`font-sans`).

### Spacing, radius, elevation, motion, z-index

Spacing follows a 4/8pt grid (Tailwind’s default scale: 1 = 4px). Prefer 2, 3, 4, 5, 6, 8, 10, 12, 16.

| Radius | Class | px |
|---|---|---|
| sm | `rounded-sm` | 8 |
| md | `rounded-md` | 12 — inputs, small tiles |
| lg | `rounded-lg` | 16 |
| xl / 2xl / 3xl | `rounded-xl` … | 20 / 24 / 32 — cards, sheets, marketing panels |
| full | `rounded-full` | pills and buttons |

Elevation: `shadow-sm`, `shadow-md` (cards), `shadow-lg` (modals and menus), `shadow-overlay` (unpinned sidebar).

Motion: `--duration-fast` 120ms, `--duration-base` 200ms, `--duration-slow` 320ms, with `--ease-out` / `--ease-in-out`. Prefer opacity and a slight `translateY` (8px). Do not use `back.out`, elastic eases, rotation, or scale bounces. Respect `prefers-reduced-motion` (already global).

Z-index layers — never invent a new one:

| Layer | Token / class | Value |
|---|---|---|
| sticky | `z-sticky` | 20 |
| nav | `z-nav` | 40 |
| overlay | `z-overlay` | 50 — menus, unpinned sidebar is nav + shadow |
| modal | `z-modal` | 60 |
| popover | `z-popover` | 65 — comboboxes inside a modal |
| toast | `z-toast` | 70 |

Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1440. Layout is checked at 375, 390, 768, 1280 and 1440.

## Primitives

All live in `src/components/ui/`. Import these instead of restyling a raw element.

- **Button / LinkButton** — `primary` `secondary` `ghost` `danger`. Sizes: `sm` 32px, `md` 40px, `lg` 48px. On touch (`pointer: coarse`), `sm` and `md` grow to a 44px minimum via `data-hit="compact"`. Supports `loading` and `disabled`.
- **IconButton** — same sizes and touch target. Always pass `label` for the accessible name. Use for close, dismiss, icon-only actions.
- **Field, Input, Textarea, FormError** — labelled field, 48px / 16px controls (class `.control`), shared error treatment.
- **Tabs** — pill tablist. Set `spread` when the tabs should fill the row (add-item).
- **Card** — bordered, raised surface for forms and marketing tiles.
- **Badge** — 12px uppercase pill. Tones: `accent` `neutral` `success` `warning`.
- **Avatar** — named sizes `xs` 24, `sm` 32, `md` 40, `lg` 48, `xl` 88, `2xl` 160. A numeric `size` remains for one-offs.
- **Modal** — dialog on desktop, bottom sheet on a phone. Close is an IconButton.
- **Toast** — success / error / info, sits above the phone tab bar.
- **Skeleton** — loading placeholders (`.skeleton`).
- **EmptyState** — dashed surface, icon, title, optional description and action.
- **CategoryPicker** — custom combobox styled like `.control`. Never use a native `<select>`.

## Navigation

There are two shells. `--nav-offset` and `--chrome-top` are set on `[data-shell]`, not globally.

**Public website** (`data-shell="marketing"`): landing, pricing, log in, sign up, and any other logged-out page (including public profiles). A 64px (`--marketing-topbar`) sticky top bar — logo on the left; Pricing, Log in and Sign up on the right. On a phone the links collapse into a compact menu. There is no left sidebar and no bottom tab bar. Sticky profile chrome uses `--chrome-top` (64px).

**Signed-in app** (`data-shell="app"`): the existing sidebar and phone bars. Desktop (`md` and up): a 72px (`--nav-rail`) icon-only sidebar. Hover or focus-within expands it to 240px (`--nav-expanded`) as an overlay after a 100ms intent delay (200ms close delay), without shifting the page. A pin control persists `shelfie.nav-pinned` in `localStorage`; when pinned, `--nav-offset` becomes 240px and the main column eases over.

Icons stay in a fixed 72px slot so they do not slide when the rail opens. Labels fade in. Primary items (Home, My shelves) sit above a utility group (Pricing). Search, Notifications and Create should be added to those groups when they exist — do not show placeholders.

Phones: 48px top bar and a 56px bottom tab bar, plus safe-area padding. Do not use the desktop rail below `md`. The bottom tab bar is hidden while a modal or sheet is open. `--chrome-top` is 48px on a phone and 0 on desktop.

## Usage for future work

1. Pick colour roles and type styles from the tables above. If a role is missing, add it to `globals.css` and this document — do not hard-code a hex.
2. Build the UI from primitives. If a new control is needed (a switch, a list row, a notification item), add it next to the existing ones and document it here.
3. Keep tap targets at or above 44px on touch, icons on the 16/20/24 scale, and spacing on the 4/8pt grid.
4. Light and dark must both be considered. Accent text and muted text already pass AA; do not mute them further.
