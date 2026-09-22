# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

---

## [Unreleased] — Security, resilience & correctness hardening

> Scope: a production code review of the API, database layer, and SPA. The
> headline work is making the anonymous-session cookie unforgeable, bounding
> the anonymous write surface, and closing several input-validation gaps that
> turned client mistakes into 500s (or, worse, into silently wrong data).

### Added
- **Rate limiting** (`middlewares/rate-limit.ts`): a dependency-free
  fixed-window limiter with bounded memory (oldest-key eviction), an injectable
  clock, and a custom key function. Wired as a coarse 300 req/min per-IP net
  across `/api`, plus tighter per-route buckets: **5/min** for the public
  waitlist, **10/min** for session resets, **60/min** for item creation.
- **Per-room item cap** (`MAX_ITEMS_PER_OWNER`, default 100): `POST /api/items`
  now returns `409` once a room is full, backed by a new indexed
  `itemsRepository.count()`. Each anonymous room was previously free storage.
- **Session cookie signing** (`lib/session.ts`): the `expiryos_demo` cookie is
  now `<uuid>.<base64url HMAC-SHA256>`, verified in constant time. Prevents a
  visitor who learns another's room id from reading, modifying, or (via
  `POST /api/session/reset`) deleting that room. **`SESSION_SECRET` is required
  in production**; the API refuses to boot without it.
- **Input validation** (`lib/validation.ts`): `expiration_date` must be a real
  calendar date in `YYYY-MM-DD` form (rejects both `"banana"` and the
  roll-over date `2026-02-31`), with length limits on title/category/notes and
  the `search` parameter. Also escapes LIKE metacharacters so a search for `%`
  matches a literal percent instead of every row.
- **Database indexes** (`schema/items.ts`): a composite
  `(owner_id, expiration_date)` index serves every item query — owner-scoped
  lookups via its leftmost prefix, and the list query's filter+sort without a
  sequential scan or a separate sort step.
- **Graceful shutdown** (`index.ts`): `SIGTERM`/`SIGINT` stop accepting
  connections, drain in-flight requests, close the pool, and exit — with a
  10-second cap and idempotent handling. Render sends `SIGTERM` on every deploy.
- **Root health endpoint**: `GET /healthz` is now served at the root in
  addition to `/api/healthz`, so a platform probe configured either way
  succeeds instead of 404ing (a failing probe can recycle the instance).
- **Tests**: `rate-limit.test.ts`, `session.test.ts`, `validation.test.ts`.
  The DB-backed owner-isolation suite gained coverage for `update`, `count`,
  `getSummary`, and empty-patch handling.

### Changed
- **Seeding runs once per room** (`middlewares/requireSession.ts`,
  `lib/session.ts`): `ensureSession` now reports whether it minted a room, and
  only new rooms are seeded. Previously every request fire-and-forgot a seed
  check, which cost a database round-trip per request and let a client trigger
  sample-data inserts just by presenting a fresh cookie value.
- **First paint is no longer racy**: the brand-new-room seed is awaited before
  the request proceeds, so the dashboard can't render an empty room and never
  refetch. If seeding fails, the room cookie is cleared so the next request
  retries with a fresh room instead of stranding the visitor.
- **Cross-replica seeding is safe** (`lib/seed.ts`): the in-memory in-flight
  map only dedupes within one process, so seeding now takes a
  transaction-scoped `pg_advisory_xact_lock` and re-checks inside the
  transaction — two replicas can no longer each insert a room's 8 sample rows.
- **Error handler honours the error's status** (`middlewares/error-handler.ts`):
  malformed JSON returns `400` (previously `500`) and oversized bodies `413`,
  with 4xx logged at `warn` and 5xx at `error` via Pino. Responses stay generic
  so internal details never leak.
- **Database TLS verification is ON by default** (`lib/db/src/ssl.ts`): the
  previous "any non-localhost URL gets `rejectUnauthorized: false`" rule
  silently disabled certificate verification for every deployment. Opting out
  now requires an explicit `DATABASE_SSL_REJECT_UNAUTHORIZED=false`. Local host
  detection parses the URL, so `localhost.example.com` is correctly treated as
  remote.
- **Fetch client retry policy** (`custom-fetch.ts`): only *quick* network
  failures are retried. A request that already consumed the 60-second timeout
  is no longer retried, which previously doubled a cold-boot wait to 120s.
- **Dashboard no longer mutates cached data** (`pages/dashboard.tsx`,
  `lib/select-needs-attention.ts`): the "Needs Attention" selection sorts
  *copies*, so it can't reorder the arrays held in the React Query cache.
- **UI thresholds no longer drift** (`components/spotlight-action.tsx`,
  `components/status-badge.tsx`): the spotlight uses the server's own
  `expiring_this_week` count instead of re-deriving a hard-coded 7-day window.
- **Search is debounced** (`hooks/use-debounced-value.ts`): the items list
  waits 300 ms after typing stops, instead of firing an unindexed `%term%` scan
  per keystroke.
- **Filters track the URL** (`hooks/use-item-filters.ts`, `lib/item-filters.ts`):
  wouter matches on pathname only, so `?status=expired` → `/demo/items` never
  remounted the list and left the filter stuck. Status is now re-synced from
  the query string.
- **`openapi.yaml`**: `expiration_date` gained a `pattern` and the text fields
  `maxLength` constraints, plus `maxLength` on `search`. Deliberately
  `pattern`, not `format: date` — the Orval config sets `useDates: true` with
  `coerce.body: ['bigint','date']`, so `format: date` would generate
  `zod.coerce.date()` and hand the repository a `Date` instead of the
  `YYYY-MM-DD` string its column expects. **Run codegen to pick this up.**

### Fixed
- **Malformed dates no longer 500 or lie**: `"banana"` previously reached the
  Postgres `date` column and threw. Worse, an unparseable date is parsed to
  `NaN` by `computeStatus`, and every comparison against `NaN` is false — so a
  malformed item would have been classified as **`active`** ("not expiring").
  Input now fails closed with a `400`.
- **`PATCH /api/items/:id` with an empty body** returned `500`
  (`No values to set` from Drizzle). Now a `400`, guarded at both the route and
  the repository.
- **Duplicate re-exports** removed from `lib/api-zod/src/index.ts`.
- **Edit form shows "Item not found"** instead of a blank form when the item is
  gone or belongs to another room.

### Notes
- **Upgrade notes:**
  1. **Set `SESSION_SECRET` in production** (Render → service → Environment).
     Generate with `openssl rand -base64 32`. The API will not start without it.
  2. Existing unsigned room cookies are rejected on deploy, so in-flight
     visitors get a fresh room. Expected for ephemeral demo rooms.
  3. Apply the new index with `pnpm --filter @workspace/db run push`.
  4. Re-run codegen for the `openapi.yaml` constraints.
  5. If the DB connection fails after upgrading, set
     `DATABASE_SSL_REJECT_UNAUTHORIZED=false` — TLS verification is now on by
     default.
- **Not changed (deliberately):** no pagination on `GET /api/items` (the
  100-item room cap already bounds the payload) and no threshold values added
  to the OpenAPI spec (needs codegen). Both are noted in the review.

---

## [Unreleased] — Docs & CI & production hardening

### Added
- **`KNOWLEDGE.md`** — a living project-knowledge file capturing the
  anonymous-demo model, monorepo layout, infrastructure/hosting (Netlify →
  Render proxy, Neon DB, env vars), CI setup, the TypeScript build-order
  gotcha, and the release notes on making the demo private.

### Changed
- **CI (`ci.yml`)** now targets Node 24 to match the Netlify runtime, enables
  pnpm from the `packageManager` field via corepack (`pnpm@10.30.3`), and omits
  the `setup-node` pnpm cache (which errors before corepack provides the binary).

### Fixed
- **Live demo became private:** `items.owner_id NOT NULL` + a new `leads` table
  were applied to the hosted Neon DB; legacy shared `items` rows were cleared so
  the `owner_id` migration succeeds. This is what made "create item" and the
  email waitlist work with no frontend redeploy.
- **API build order (CI):** the api-server `typecheck` now uses
  `tsc --build tsconfig.json` (with `--build` first) so the composite
  `@workspace/db` and `@workspace/api-zod` declarations build before
  typechecking — resolving the `TS6305` family.
- **DB fail-fast:** `lib/db/src/index.ts` throws at startup when `DATABASE_URL`
  is missing and sets sane pool timeouts so a dead DB fails fast instead of
  hanging requests.

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
