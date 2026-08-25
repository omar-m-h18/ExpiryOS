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
- **"Start a sample" reset** — restart the current demo room with fresh sample data at any time
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
  sample items so the dashboard is never empty. The **"Start a sample"** control
  calls `POST /api/session/reset` to restart the room with fresh sample data.
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

**Prerequisites:** Node.js 24+, pnpm 10.30.3 (via corepack / `packageManager`), PostgreSQL 15+ or a serverless instance (e.g. Neon)

```bash
# 1. Clone the repository
git clone https://github.com/omar-m-h18/ExpiryOS
cd expiry-os

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL and PORT at minimum

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. Start the development servers
pnpm --filter @workspace/api-server run dev   # Express API
pnpm --filter @workspace/expiry-os run dev   # Vite frontend
```

In development the frontend proxies API calls through Vite to the Express server.
In production the SPA is served statically and `/api/*` is routed to the API
host via a reverse proxy (see [Hosting / Deploy](#hosting--deploy)).

---

## Hosting / Deploy

The demo is deployed as two parts that talk through a reverse proxy:

- **Frontend** — the Vite SPA (`@workspace/expiry-os`) builds to static files
  and is served by Netlify.
- **API** — the Express server (`@workspace/api-server`) runs on Render.
- **Database** — serverless PostgreSQL (Neon). The schema is applied with
  `pnpm --filter @workspace/db run push`.

Netlify routes `/api/*` to the Render API host via `public/_redirects`, so the
browser talks to one origin while the API handles requests server-side. CI
(`.github/workflows/ci.yml`) typechecks and unit-tests every push on Node 24 +
pnpm, so it catches build-order and type errors before a release.

---

## Project Structure

```
expiry-os/
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

All tuneable values are environment variables. See `.env.example` for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | **Required.** PostgreSQL connection string |
| `PORT` | — | **Required.** API server port |
| `NODE_ENV` | `development` | `production` enables JSON logging |
| `LOG_LEVEL` | `info` | Pino log level |
| `EXPIRING_SOON_DAYS` | `30` | Days window for "expiring soon" status |
| `EXPIRING_THIS_WEEK_DAYS` | `7` | Days window for dashboard "this week" bucket |
| `APP_NAME` | `ExpiryOS` | Application name in logs |
| `FRONTEND_URL` | — | CORS allow-list for the API in production |

---

## Architecture Decisions

### OpenAPI-first
`lib/api-spec/openapi.yaml` is the single source of truth for the API contract. Orval generates the client hooks (`api-client-react`) and server schemas (`api-zod`) from it. **Never hand-edit generated files** — regenerate with `pnpm --filter @workspace/api-spec run codegen`.

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
| `POST` | `/leads` | Join the early-bird waitlist (email) |

Full schema: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)

---

## Future Extensibility

The architecture is designed so the following additions require no major refactoring:

- **Authentication** — add auth middleware; scope repository queries by `userId`
- **Notifications** — read from the repository on a schedule; no route changes needed
- **Import/Export** — add routes that call `findAll()` and reformat the output
- **Multi-user** — add tenant scoping to the repository interface
- **Testing** — inject a mock `IItemsRepository`; no real database needed
- **Docker** — add `Dockerfile` + `docker-compose.yml` at the repo root
- **CI/CD** — add `.github/workflows/ci.yml` running `pnpm run typecheck`

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, branching strategy, commit conventions, and architecture notes.

---

## License

[MIT](LICENSE) © ExpiryOS Contributors
