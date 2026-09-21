# ExpiryOS

A clean, focused web application for tracking items with expiration dates — licenses, subscriptions, documents, insurance policies, and anything else that expires.

Organizations and individuals often track licenses, subscriptions, contracts, certifications, and other time-sensitive records across spreadsheets, calendars, emails, or paper. As these records grow, it becomes easy to miss renewal dates, causing unnecessary administrative work, service interruptions, or compliance risks.

ExpiryOS provides a single place to manage these records and automatically identifies which items are active, expiring soon, or expired.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Features

- **Full CRUD** — add, edit, and delete tracked items with title, category, expiration date, and notes
- **Automatic status** — items are classified as *Active*, *Expiring Soon* (within 30 days), or *Expired* in real time — no background jobs needed
- **Dashboard** — summary counts, "Needs Attention" list sorted by urgency, and an "Expiring This Week" spotlight
- **Search & filter** — search by name or category; filter by status with one-tap pill buttons
- **Light / dark mode** — with system-preference detection and `localStorage` persistence
- **Mobile-first** — responsive layout with a bottom tab bar on mobile; sidebar on desktop
- **OpenAPI-first** — single source of truth in `lib/api-spec/openapi.yaml`; client hooks and Zod schemas are code-generated
- **Private per-visitor demo** — each visitor gets their own ephemeral room with no sign-up; data is isolated to that visitor and disappears when the browser closes
- **Auto-seeded sample data** — a brand-new room is populated with realistic, today-relative sample items so the demo is never empty
- **Early-bird waitlist** — submit an email to join a self-hosted waitlist (no third-party marketing service)

---

## Anonymous Demo / Privacy

ExpiryOS is a **private, anonymous demo**: no accounts, no sign-up. Every
visitor gets their own ephemeral "room":

- A per-visitor `HttpOnly` session cookie (`expiryos_demo`) maps to a random
  `ownerId`; the `requireSession` middleware attaches it to every request.
- All items are scoped to that `ownerId` — **no visitor can see or modify
  another visitor's data**.
- The room is temporary: because the cookie has no expiry, it disappears when
  the browser (or a private window) closes. A fresh visit gets a clean room.
- A brand-new room is automatically seeded with realistic, today-relative
  sample items so the dashboard is never empty. There is no in-app reset
  control; the server-side `POST /api/session/reset` endpoint exists but is not
  currently wired to the UI.
- A self-hosted **early-bird waitlist** (`POST /api/leads`) captures emails for
  launch announcements — no third-party marketing service.

---

## Screenshots
<img width="1306" height="458" alt="image" src="https://github.com/user-attachments/assets/429b27c8-a601-445e-a3e3-a70129505e29" />
<img width="1298" height="458" alt="image" src="https://github.com/user-attachments/assets/ddb5d9b1-2681-4cf7-9b00-3fe1949ca458" />
<img width="1304" height="465" alt="image" src="https://github.com/user-attachments/assets/7a2239b6-6edf-4f7e-b2fa-d1b13a503e83" />

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui |
| Routing | Wouter |
| Data fetching | TanStack Query v5 (Orval-generated hooks) |
| Forms | React Hook Form + Zod |
| API | Express 5 |
| Validation | Zod (Orval-generated from OpenAPI) |
| Database | PostgreSQL via Drizzle ORM (serverless / Neon-compatible) |
| Session isolation | `HttpOnly` session cookie → per-visitor `ownerId` |
| Logging | Pino |
| Monorepo | pnpm workspaces |

---

## Getting Started

**Prerequisites:** Node.js 24+, pnpm 10.30.3 (via corepack / the root
`packageManager` field), and PostgreSQL 15+ or a serverless instance (e.g. Neon).

```bash
# 1. Clone the repository
git clone https://github.com/omar-m-h18/ExpiryOS
cd ExpiryOS

# 2. Install all workspace dependencies
pnpm install

# 3. Push the database schema (requires DATABASE_URL to be set — see below)
pnpm --filter @workspace/db run push
```

### Environment variables

`.env.example` is a **reference only** — the app does **not** auto-load a `.env`
file (there is no `dotenv` dependency). Each process reads `process.env`
directly, so provide the variables through your shell, your hosting platform
(Render / Netlify), or an explicit `--env-file` flag. At minimum set
`DATABASE_URL` and `PORT`.

```powershell
# PowerShell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/expirytracker"
$env:PORT = "3001"
```

```bash
# bash / zsh
export DATABASE_URL="postgresql://postgres:password@localhost:5432/expirytracker"
export PORT=3001
```

### Run the development servers

Run the API and the frontend in **two separate terminals**.

**API** — the package's own `dev` script uses bash `export` syntax and fails in
PowerShell, so build and start it explicitly:

```bash
pnpm --filter @workspace/api-server run build

# PowerShell
$env:NODE_ENV = "development"; pnpm --filter @workspace/api-server run start

# bash / zsh
NODE_ENV=development pnpm --filter @workspace/api-server run start
```

**Frontend** — Vite, port `3000` by default (`PORT` overrides it):

```bash
pnpm --filter @workspace/expiry-os run dev
```

> Both the API and Vite read `PORT`, so avoid exporting the same value in both
> terminals. Set `PORT` for the API and let Vite default to `3000`, or give them
> distinct values.

> **Local API wiring:** there is **no Vite dev proxy**. The SPA calls `/api/*`
> on its own origin unless you point it at the API. Set
> `VITE_API_BASE_URL=http://localhost:<api-port>` (e.g. `http://localhost:3001`)
> in your environment before starting Vite (or in a `.env` file inside
> `artifacts/expiry-tracker/`), and restart Vite after changing it.

In production the SPA is served statically and `/api/*` is routed to the API
host via a reverse proxy (see [Hosting / Deploy](#hosting--deploy)).

---

## Testing & Verification

There is no linter or formatter; TypeScript is the safety net.

```bash
# Typecheck every workspace package (also builds the shared libs first)
pnpm run typecheck

# Run the API unit tests
pnpm --filter @workspace/api-server test

# Run a single test file
pnpm --filter @workspace/api-server exec vitest run src/lib/status.test.ts
```

DB-backed tests (`*.owner.test.ts`) are skipped unless `RUN_DB_TESTS=1` **and** a
real `DATABASE_URL` are set. CI provisions an ephemeral PostgreSQL service so
they always run there.

---

## Hosting / Deploy

The demo is deployed as two parts that talk through a reverse proxy:

- **Frontend** — the Vite SPA (`@workspace/expiry-os`) builds to static files
  and is served by Netlify.
- **API** — the Express server (`@workspace/api-server`) runs on Render.
- **Database** — serverless PostgreSQL (Neon). The schema is applied with
  `pnpm --filter @workspace/db run push`.

Netlify routes `/api/*` to the Render API host via `public/_redirects`, so the
browser talks to one origin while the API handles requests server-side.

CI (`.github/workflows/ci.yml`) runs on every push to `main` and on pull
requests, on Node 24 + pnpm:

1. `pnpm run typecheck`
2. `pnpm --filter @workspace/db run push` against an ephemeral PostgreSQL service
3. `pnpm --filter @workspace/api-server test` with `RUN_DB_TESTS=1`, so the
   DB-backed owner-isolation tests run

A separate `deploy-netlify` job builds the SPA and deploys it to Netlify, but
**only after the checks pass and only on pushes to `main`**. It needs the
`NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` repository secrets; if they are
missing the deploy action exits successfully without deploying, so a green check
does not by itself prove the site was updated. Do **not** add `cache: pnpm` to
`actions/setup-node` — it runs before corepack provides pnpm and fails.

---

## Project Structure

```
ExpiryOS/
├── artifacts/
│   ├── api-server/              # Express 5 REST API
│   │   └── src/
│   │       ├── config/          # Environment-driven configuration (thresholds, APP_NAME)
│   │       ├── lib/
│   │       │   ├── logger.ts    # Pino structured logger
│   │       │   ├── status.ts    # Expiry status computation (computeStatus, enrichItem)
│   │       │   ├── sample-data.ts # Today-relative sample item roster
│   │       │   ├── seed.ts      # Idempotent per-session sample seeding
│   │       │   └── session.ts   # Ephemeral visitor session cookie handling
│   │       ├── middlewares/     # requireSession (ownerId + seeding), error-handler
│   │       ├── repositories/    # Data-access abstraction (IItemsRepository, leads)
│   │       └── routes/          # Thin HTTP handlers (items, leads, session, health)
│   └── expiry-tracker/          # React + Vite SPA (Replit artifact path; package @workspace/expiry-os)
│       └── src/
│           ├── components/      # Reusable UI components (shadcn/ui + custom)
│           ├── hooks/           # Custom React hooks (useItemFilters, useToast)
│           ├── lib/             # Frontend utilities (cn, formatDate, demo client)
│           └── pages/           # Route-level page components
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 specification — the API contract
│   ├── api-client-react/        # Generated — TanStack Query hooks (do not edit)
│   ├── api-zod/                 # Generated — Zod request/response schemas (do not edit)
│   └── db/                      # Drizzle ORM schema + PostgreSQL connection
│       └── src/schema/          # items.ts, leads.ts
├── .github/workflows/ci.yml     # CI pipeline (Node 24 + pnpm)
├── .env.example                 # Annotated environment variable reference
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE                      # MIT
```

---

## How Status Works

Expiry status is **never stored in the database**. It is computed fresh on every request by `artifacts/api-server/src/lib/status.ts`:

```
today = midnight local time
days_remaining = floor((expiry_date - today) / 1 day)

days_remaining < 0              → "expired"
0 ≤ days_remaining ≤ threshold  → "expiring_soon"
days_remaining > threshold      → "active"
```

The threshold defaults to **30 days** and is configurable via `EXPIRING_SOON_DAYS`.

This approach means:
- Status updates automatically at midnight with no background jobs
- The database schema is simpler (no status column, no migrations when thresholds change)
- The threshold can be changed at any time without a data migration

---

## Configuration

All tuneable values are environment variables. See `.env.example` for the full list. These are **not** auto-loaded from a `.env` file — see [Environment variables](#environment-variables).

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | **Required.** PostgreSQL connection string |
| `PORT` | — | **Required.** API server port |
| `NODE_ENV` | `development` | `production` enables JSON logging |
| `LOG_LEVEL` | `info` | Pino log level |
| `EXPIRING_SOON_DAYS` | `30` | Days window for "expiring soon" status |
| `EXPIRING_THIS_WEEK_DAYS` | `7` | Days window for dashboard "this week" bucket |
| `APP_NAME` | `ExpiryOS` | Application name in logs |
| `FRONTEND_URL` | — | **Required in production.** CORS allow-list for the API; the server refuses to start without it |

---

## Architecture Decisions

### OpenAPI-first
`lib/api-spec/openapi.yaml` is the single source of truth for the API contract. Orval generates the client hooks (`api-client-react`) and server schemas (`api-zod`) from it. **Never hand-edit generated files** — regenerate with `pnpm --filter @workspace/api-spec run codegen`.

> **Codegen caveat:** the codegen script ends with `pnpm -w run typecheck:libs`,
> which is not defined in the root `package.json`. Generation succeeds but that
> final step errors — run `pnpm run typecheck` afterwards instead.

### Repository pattern
All database access is routed through `IItemsRepository` (`repositories/items.repository.ts`). This makes it straightforward to swap PostgreSQL for another database — implement the interface, update the singleton export, and no other code changes are needed.

Item queries and mutations are **scoped by `ownerId`** (the visitor's session), so cross-visitor reads return empty and mutations can only ever target the caller's own rows — the per-visitor privacy guarantee.

### Status is derived, not stored
See [How Status Works](#how-status-works) above.

---

## API Reference

Base path: `/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/session` | Confirm the anonymous session layer is alive |
| `POST` | `/session/reset` | Start a fresh room (clear + re-seed sample data) |
| `GET` | `/items` | List items (supports `search`, `status`, `sort` query params) |
| `POST` | `/items` | Create an item |
| `GET` | `/items/summary` | Aggregate counts by status |
| `GET` | `/items/:id` | Get a single item |
| `PATCH` | `/items/:id` | Partially update an item |
| `DELETE` | `/items/:id` | Delete an item |
| `POST` | `/leads` | Join the early-bird waitlist (email) — returns `201` |

> **Spec drift:** `lib/api-spec/openapi.yaml` documents the reset endpoint as
> `POST /session`, but the server implements `POST /session/reset`. The
> generated reset hook is therefore not wired up; the app relies on automatic
> first-visit seeding instead.

Full schema: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)

---

## Future Extensibility

The architecture is designed so the following additions require no major refactoring:

- **Authentication** — add auth middleware; scope repository queries by `userId`
- **Notifications** — read from the repository on a schedule; no route changes needed
- **Import/Export** — add routes that call `findAll()` and reformat the output
- **Multi-user** — add tenant scoping to the repository interface
- **Docker** — add `Dockerfile` + `docker-compose.yml` at the repo root

---

## Roadmap

ExpiryOS follows a milestone-based roadmap to keep development focused while maintaining a stable, lightweight open-source project. Planned features are prioritized based on community feedback, practical value, and alignment with the project's core purpose.

### v1.2

- Docker support
- CSV import and export
- SQLite database provider
- ~~Automated unit tests~~ (Vitest — see `.github/workflows/ci.yml`)
- ~~GitHub Actions CI pipeline~~ (`.github/workflows/ci.yml`)

### v1.3

- Supabase database provider
- Custom "Expiring Soon" threshold
- Category management improvements
- Bulk item actions

### v2.0

- User authentication
- Multi-user workspaces
- Notification system
- File attachments

> **Note:** This roadmap is subject to change as the project evolves and community contributions help shape future releases.

---

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) is currently **under revamping**. For
current workflow and commands, see [`AGENTS.md`](AGENTS.md); for architecture
context, see [`KNOWLEDGE.md`](KNOWLEDGE.md).

---

## License

[MIT](LICENSE) © ExpiryOS Contributors
