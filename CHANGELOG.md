# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

---

## [1.1.0] — 2026-07-21

Project-wide rebrand from **Expiry Tracker** to **ExpiryOS** plus open-source readiness and UX polish.

### Changed
- **Branding**: renamed all visible references from "Expiry Tracker" / "ExpiryTracker" to **ExpiryOS**.
  - Application title, browser metadata, and logo text.
  - Frontend package renamed to `@workspace/expiry-os`.
  - Replit workflow command updated to use the new package name.
  - Default `APP_NAME` changed from `ExpiryTracker` to `ExpiryOS`.
  - Theme `localStorage` key changed from `expiry-tracker-theme` to `expiry-os-theme`.
- **OpenAPI specification**: description updated to *ExpiryOS API specification*; all generated client hooks and Zod schemas regenerated.
- **Dashboard Spotlight**: clicking the Spotlight call-to-action now navigates to the single expiring item when only one exists, or to the filtered "Expiring Soon" list when multiple items are due this week.
- **Repository pattern**: extracted `IItemsRepository` interface and `DrizzleItemsRepository` implementation, decoupling data access from route handlers.
- **Status computation**: moved all expiry-status logic into `lib/status.ts` with fully documented `computeStatus()` and `enrichItem()` helpers; status remains derived at request time rather than stored.
- **Config centralization**: all tuneable thresholds (`EXPIRING_SOON_DAYS`, `EXPIRING_THIS_WEEK_DAYS`) and `APP_NAME` now live in `config/index.ts` and load from environment variables with backward-compatible defaults.
- **Route handlers**: thinned to validation + delegation only; moved business logic out of `routes/items.ts`.
- **Error handling**: added a global Express error handler for consistent JSON error responses; Zod validation errors now include detailed `details`.
- **Accessibility**: improved page landmarks, added `aria-label` to the items-list sort toggle, and added `aria-hidden` on decorative icons in the not-found page.
- **Items list filtering**: extracted `useItemFilters` hook to own search/status/sort state and respect the initial `?status=` URL parameter.
- **Theme**: added light/dark/system theme provider with `localStorage` persistence.
- **Dashboard**: improved "Needs Attention" section to include both expired and expiring-soon items sorted by urgency; replaced filter/sort dropdowns with pill-tab filters and a single sort-toggle button; added mobile bottom tab bar while keeping the desktop sidebar.

### Added
- `README.md` with setup instructions, project structure, status algorithm explanation, API reference, and extensibility notes.
- `CONTRIBUTING.md` with development workflow, branching strategy, conventional commits, and architecture notes.
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1).
- `LICENSE` (MIT).
- `.env.example` with annotated environment variable reference.
- JSDoc/TSDoc comments across exported modules.

---

## [1.1.0] — Unreleased (Anonymous Demo + Waitlist)

> Scope: turn the core CRUD demo into a launchable v1 with a public landing
> page, private per-visitor ephemeral demo sessions, auto-seeded sample data,
> and a self-hosted early-bird waitlist. This is the feature set rolled out as
> the "27-file" anonymous-demo change.

### Added
- **Anonymous demo sessions** (`lib/session.ts`): each visitor gets a private,
  ephemeral "room" via an `HttpOnly`, `SameSite=Lax` session cookie with no
  expiry — the room dies when the browser closes. Deliberately substitutes real
  per-user accounts for v1 so visitors can try the product with zero signup.
- **`requireSession` middleware** (`middlewares/requireSession.ts`): guarantees
  every request carries a session id (`req.ownerId`) and fires best-effort,
  idempotent sample-data seeding on a brand-new room.
- **Realistic sample-data seeding** (`lib/sample-data.ts`, `lib/seed.ts`): a
  fresh room is auto-seeded with 8 items whose dates are computed relative to
  *today* — covering active, expiring-this-week, expiring-soon, and expired —
  so the demo dashboard is never empty and always looks alive on any first run.
  Seeding is idempotent and runs inside a transaction.
- **Per-owner data isolation** (`repositories/items.repository.ts`): every
  method is scoped by `ownerId` — `findAll`, `findById`, `create`, `update`,
  `delete`, and `getSummary` filter on the owner, so cross-visitor reads return
  empty/null and mutations can only ever target that owner's rows. This is the
  "private to each visitor" guarantee.
- **Early-bird waitlist** (`schema/leads.ts`, `repositories/leads.repository.ts`,
  `routes/leads.ts`): `POST /api/leads` captures an email (trimmed + lowercased,
  stored uniquely, idempotent on duplicates) into a self-hosted `leads` table.
  No third-party marketing service is used — fully self-hosted.
- **Session endpoints** (`routes/session.ts`): `GET /api/session` (health) and
  `POST /api/session/reset` (issue a fresh room, drop the old owner's rows, and
  re-seed) — powers the "Start a sample" demo control.
- **Public landing page** (`pages/landing.tsx`): the app's `/` route, with a
  clear "this is a live demo — private, resets on browser close" notice, a
  **Start Demo** CTA to `/demo`, and an inline early-bird waitlist form with
  client-side validation, busy-state button, and success/error toasts.
- **Demo session banner** (`components/demo-banner.tsx`): an on-brand banner
  inside the app explaining the session is temporary, with a "Start a sample"
  action (clears the room via the reset endpoint and invalidates queries).
- **Frontend demo client** (`lib/demo.ts`): thin helpers for the new session
  and leads endpoints, reusing the existing JSON/fetch conventions and sending
  the session cookie (`credentials: include`).
- **OpenAPI contract** (`lib/api-spec/openapi.yaml`): added `/session` and
  `/leads` paths plus `SessionInfo`, `LeadInput`, and `Lead` schemas so the
  new surface is contractually described (regenerate generated code with
  `pnpm --filter @workspace/api-spec run codegen`).

### Changed
- **Schema** (`schema/items.ts`): added a `NOT NULL` `owner_id` column to scope
  items to a visitor's session. This is a schema change — the hosted database
  must be migrated (apply the schema / run Drizzle against Neon) before this
  build runs.
- **`app.ts`**: wired `cookie-parser` and mounted `requireSession` globally
  before the `/api` router; documented the `FRONTEND_URL` / CORS behaviour
  (explicit allow-list in production, permissive dev fallback).
- **Routing** (`App.tsx`, `layout.tsx`, `dashboard.tsx`, `items-list.tsx`,
  `item-form.tsx`, `not-found.tsx`, `spotlight-action.tsx`): the app now lives
  under `/demo/*`; `/` is the public landing page. All internal navigation was
  updated to the `/demo` prefix.
- **`routes/items.ts`**: every handler now passes `req.ownerId` into the item
  repository to preserve scoping across all HTTP methods.

### Fixed
- **Delete button on the items list** (`items-list.tsx`): the delete control was
  nested inside the item's `<Link>`, so confirming deletion navigated to the edit
  page and masked the delete. Only the title/expiry info is now the link; the
  status badge and delete button sit outside any anchor, so a delete click can
  no longer be swallowed by navigation. This also removes the invalid
  "interactive element nested in an anchor" anti-pattern for better a11y.

### Notes
- No API surface was removed. Existing `/api/items` and `/api/healthz`
  endpoints keep their shape and are now silently scoped to the caller's
  session under the hood.
- **Upgrade note (v1.0.0 → v1.1.0):** because `owner_id` is `NOT NULL` with no
  existing value, an `items` table that already holds data will fail the column
  migration. This project was launched under an anonymous demo, so clearing
  legacy `items` rows (via the Neon SQL editor or by dropping the table) is the
  intended, safe migration path before/at deploy.

---

## [1.0.0] — 2026-07-17

### Added
- Initial release.
- Full CRUD for tracked items (title, category, expiration date, notes).
- Dynamic status classification: `active`, `expiring_soon`, `expired`.
- Dashboard with summary cards and "Needs Attention" list.
- Item search, status filtering, and sort order on the items list.
- Light/dark mode theme toggle.
- Mobile-responsive layout with bottom tab bar.
- OpenAPI-first design with Orval-generated React Query hooks and Zod schemas.
- PostgreSQL storage via Drizzle ORM.
- Structured JSON logging via Pino.
