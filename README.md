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
| Database | PostgreSQL via Drizzle ORM |
| Logging | Pino |
| Monorepo | pnpm workspaces |

---

## Getting Started

**Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL 15+

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

The frontend proxies API calls through Vite to the Express server.

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
│   │       │   └── status.ts   # Expiry status computation (computeStatus, enrichItem)
│   │       ├── repositories/    # Data-access abstraction (IItemsRepository)
│   │       └── routes/          # Thin HTTP handlers
│   └── expiry-tracker/          # React + Vite SPA (Replit artifact path; package @workspace/expiry-os)
│       └── src/
│           ├── components/      # Reusable UI components (shadcn/ui + custom)
│           ├── hooks/           # Custom React hooks (useItemFilters, useToast)
│           ├── lib/             # Frontend utilities (cn, formatDate)
│           └── pages/           # Route-level page components
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 specification — the API contract
│   ├── api-client-react/        # ⚙️ Generated — TanStack Query hooks (do not edit)
│   ├── api-zod/                 # ⚙️ Generated — Zod request/response schemas (do not edit)
│   └── db/                      # Drizzle ORM schema + PostgreSQL connection
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

---

## Architecture Decisions

### OpenAPI-first
`lib/api-spec/openapi.yaml` is the single source of truth for the API contract. Orval generates the client hooks (`api-client-react`) and server schemas (`api-zod`) from it. **Never hand-edit generated files** — regenerate with `pnpm run codegen`.

### Repository pattern
All database access is routed through `IItemsRepository` (`repositories/items.repository.ts`). This makes it straightforward to swap PostgreSQL for another database — implement the interface, update the singleton export, and no other code changes are needed.

### Status is derived, not stored
See [How Status Works](#how-status-works) above.

---

## API Reference

Base path: `/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/items` | List items (supports `search`, `status`, `sort` query params) |
| `POST` | `/items` | Create an item |
| `GET` | `/items/summary` | Aggregate counts by status |
| `GET` | `/items/:id` | Get a single item |
| `PATCH` | `/items/:id` | Partially update an item |
| `DELETE` | `/items/:id` | Delete an item |

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, branching strategy, commit conventions, and architecture notes.

---

## License

[MIT](LICENSE) © ExpiryOS Contributors
