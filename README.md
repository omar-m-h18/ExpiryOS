# ExpiryOS

A focused web application for tracking expiration dates across licenses, subscriptions, documents, insurance policies, and warranties.

ExpiryOS centralizes renewal tracking and automatically computes item urgency (*Active*, *Expiring Soon*, or *Expired*) on request without background cron jobs or stored state.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Features

- **Full CRUD** — Manage tracked records with title, category, expiration date, and notes.
- **Dynamic Status** — Computes *Active*, *Expiring Soon* (≤ 30 days), and *Expired* states at query time.
- **Triage Dashboard** — Aggregated status counters, an urgent "Needs Attention" queue, and an "Expiring This Week" spotlight.
- **Search & Filter** — Debounced search (title, category) and URL-synchronized status tabs (`all`, `active`, `expiring_soon`, `expired`).
- **Category Quick-Picks** — Suggested category chips (*Documents*, *Subscriptions*, *Insurance*, *Software*, *Warranties*, *Health*) for fast entry.
- **Interactive Onboarding** — 3-step skippable walkthrough for empty rooms with live preset simulations and session persistence.
- **On-Demand Sample Data** — Load 4 representative sample records into an empty room with a single click.
- **Theme Support** — Light and dark mode with system preference detection and `localStorage` persistence.
- **Mobile-First Interface** — Responsive desktop sidebar and mobile bottom tab bar navigation.
- **OpenAPI-First** — Single contract source in `lib/api-spec/openapi.yaml`; client hooks and Zod validation schemas are code-generated.
- **Private Ephemeral Demo** — HMAC-SHA256 signed session cookies map visitors to isolated rooms. No user accounts required.
- **Early Access Waitlist** — Embedded modal integration (Tally.so) across banner, navigation, landing, and milestone callouts.

---

## Tenancy & Privacy Model

The live demo operates as an isolated, multi-tenant sandbox without registration:

- **Signed Session Cookie:** Each visitor receives an `HttpOnly`, `SameSite=Lax` session cookie (`expiryos_demo`) signed via HMAC-SHA256. The signed payload maps directly to an isolated `ownerId`.
- **Owner Scoping:** All database operations are filtered by `ownerId`. Cross-tenant reads and mutations are rejected at the repository layer.
- **Ephemeral Lifecycle:** Cookies do not set an expiration date; closing the browser terminates the session.
- **Zero-Write Cold Start:** New rooms start empty. No database writes occur until a visitor creates an item or requests sample data.
- **Per-Room Quota:** Rooms enforce a strict cap of **10 items** (`MAX_ITEMS_PER_OWNER`). Exceeding the quota returns HTTP 409 and disables creation controls.

---

## Tech Stack

| Component | Technology | Details |
|---|---|---|
| **Frontend** | React 19, Vite 7 | Tailwind CSS 4, shadcn/ui components |
| **Routing** | Wouter | Lightweight client-side routing |
| **Client State** | TanStack Query v5 | Auto-generated hooks via Orval |
| **Form Management** | React Hook Form, Zod | Schema validation matching API specs |
| **Backend API** | Express 5, Node.js 24 | ESM, Pino structured logging |
| **Database** | PostgreSQL, Drizzle ORM | Serverless/Neon compatible |
| **Contract** | OpenAPI 3.1 | Single source of truth for schemas and hooks |
| **Monorepo** | pnpm workspaces | Workspaces for core libs, server, and client |

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10.30.3 (enabled via Corepack)
- PostgreSQL 15+ (or cloud Neon instance)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/omar-m-h18/ExpiryOS
cd ExpiryOS

# 2. Install dependencies
pnpm install

# 3. Push database schema
pnpm --filter @workspace/db run push
```

### Environment Configuration

Process variables are read directly from `process.env`. Reference variables are documented in `.env.example`.

```bash
# Minimum configuration (bash / zsh)
export DATABASE_URL="postgresql://postgres:password@localhost:5432/expirytracker"
export SESSION_SECRET="dev-insecure-secret-must-be-32-bytes-in-prod"
export PORT=3001
```

```powershell
# Minimum configuration (PowerShell)
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/expirytracker"
$env:SESSION_SECRET = "dev-insecure-secret-must-be-32-bytes-in-prod"
$env:PORT = "3001"
```

### Development Execution

Run the API server and frontend SPA in separate terminals:

```bash
# Terminal 1: API Server
pnpm --filter @workspace/api-server run build
NODE_ENV=development pnpm --filter @workspace/api-server run start
```

```bash
# Terminal 2: Frontend SPA (defaults to port 3000)
# Configure API target for local SPA requests:
export VITE_API_BASE_URL="http://localhost:3001"
pnpm --filter @workspace/expiry-os run dev
```

> **Note:** The frontend has no local proxy. Set `VITE_API_BASE_URL` to point client requests to the active API port during local development.

---

## Verification & Testing

```bash
# Typecheck all packages (compiles referenced composite libraries first)
pnpm run typecheck

# Run API test suites (Vitest)
pnpm --filter @workspace/api-server test

# Run full database integration suite (requires active PostgreSQL instance)
RUN_DB_TESTS=1 DATABASE_URL="postgresql://..." pnpm --filter @workspace/api-server test
```

---

## Deployment Architecture

The production application runs as a decoupled frontend and API:

- **Frontend:** Static SPA build deployed to Netlify. Netlify redirects (`public/_redirects`) proxy `/api/*` requests to the Render backend to maintain a single origin.
- **Backend API:** Containerized Express server hosted on Render.
- **Database:** Managed serverless PostgreSQL on Neon.

CI pipeline (`.github/workflows/ci.yml`) triggers on pull requests and pushes to `main`:
1. Executes `pnpm run typecheck` across all workspace packages.
2. Boots an ephemeral PostgreSQL service and applies schema migrations (`pnpm --filter @workspace/db run push`).
3. Executes unit and owner-isolation integration suites with `RUN_DB_TESTS=1`.
4. Deploys static build to Netlify upon successful completion of checks on `main`.

---

## Repository Structure

```
ExpiryOS/
├── artifacts/
│   ├── api-server/              # Express 5 REST API
│   │   └── src/
│   │       ├── config/          # Environment configuration & limits
│   │       ├── lib/             # Status engine, session signer, logger, validators
│   │       ├── seed/            # Opt-in 4-item sample roster & date math
│   │       ├── middlewares/     # requireSession (cookie verification), error-handler
│   │       ├── repositories/    # IItemsRepository abstraction + Drizzle implementation
│   │       └── routes/          # Express route handlers (items, session, health)
│   └── expiry-tracker/          # React 19 + Vite SPA (package: @workspace/expiry-os)
│       └── src/
│           ├── components/      # UI components (first-run, layout, calendar, badges)
│           ├── hooks/           # useItemFilters, useDebouncedValue, useRoomIsEmpty
│           ├── lib/             # utils, tally integration, date helpers
│           └── pages/           # dashboard, items-list, item-form, landing
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 specification (source of truth)
│   ├── api-client-react/        # Generated TanStack Query client hooks
│   ├── api-zod/                 # Generated Zod validation schemas
│   └── db/                      # Drizzle database client and schema definitions
├── .github/workflows/ci.yml     # Automated verification and deployment pipeline
├── CHANGELOG.md                 # Semantic versioning release log
├── KNOWLEDGE.md                 # Living engineering and architecture record
├── decision documentation.md    # Formal architectural decision records (ADRs)
└── LICENSE                      # MIT
```

---

## Status Computation Engine

Status values are **computed at runtime** and are never persisted in the database (`artifacts/api-server/src/lib/status.ts`). Calculations use UTC calendar midnight timestamps to remain immune to local server timezone differences and Daylight Saving Time (DST) shifts:

```typescript
const now = new Date();
const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
const [year, month, day] = expirationDate.split("-").map(Number);
const expiryUtc = Date.UTC(year, month - 1, day);

const daysRemaining = Math.round((expiryUtc - todayUtc) / 86400000);

if (daysRemaining < 0) return "expired";
if (daysRemaining <= expiringSoonThreshold) return "expiring_soon";
return "active";
```

- **Thresholds:** `EXPIRING_SOON_DAYS` (default: 30) and `EXPIRING_THIS_WEEK_DAYS` (default: 7).
- **Benefits:** Zero daily cron maintenance, zero status column migrations, and instantaneous threshold updates.

---

## API Specification

Base path: `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/healthz` | System health check (also exposed at root `/healthz`). |
| `GET` | `/session` | Validates session signature and returns session metadata. |
| `POST` | `/session/reset` | Resets active room and populates the 4-item sample roster. |
| `GET` | `/items` | Retrieves items filtered by `search`, `status`, and `sort`. |
| `POST` | `/items` | Creates a new record (capped at `MAX_ITEMS_PER_OWNER`). |
| `GET` | `/items/summary` | Returns aggregated status counters. |
| `GET` | `/items/:id` | Retrieves a single item record. |
| `PATCH` | `/items/:id` | Applies partial update to an existing record. |
| `DELETE` | `/items/:id` | Deletes record. Returns `204 No Content`. |

Contract definition: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).  
Code regeneration command: `pnpm --filter @workspace/api-spec run codegen`.

---

## License

[MIT](LICENSE) © ExpiryOS Contributors
