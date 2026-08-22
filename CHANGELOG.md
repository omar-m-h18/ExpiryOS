# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

---

## [Unreleased]

### Changed
- Extracted status computation into `lib/status.ts` with full JSDoc.
- Introduced `repositories/items.repository.ts` with `IItemsRepository`
  interface and `DrizzleItemsRepository` implementation — decouples data
  access from route handlers.
- Centralised all configurable thresholds in `config/index.ts` (previously
  hard-coded magic numbers in route handlers).
- Thinned route handlers to validation + delegation only.
- Added global Express error handler for consistent error response shape.
- Replaced hardcoded hex status colours with CSS design tokens (`success`,
  `warning`) for correct dark-mode support.
- Added light/dark mode toggle with system-preference detection and
  `localStorage` persistence.
- Improved "Needs Attention" dashboard section to include both expired and
  expiring-soon items sorted by urgency.
- Replaced filter/sort dropdowns on the items list with pill-tab filters and
  a single sort-toggle button.
- Added mobile bottom tab bar; desktop sidebar unchanged.

### Added
- `LICENSE` (MIT)
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `.env.example` with annotated variable reference
- JSDoc/TSDoc comments across exported modules

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
