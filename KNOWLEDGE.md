# Project Knowledge — ExpiryOS

This file is the living context for developers working on ExpiryOS. It records
architecture decisions, the anonymous-demo model, the production hosting/release
setup, and the hard-won debugging facts from getting a deployed demo working.
It complements (and occasionally overrides with real experience) the formal
docs in `README.md` and `IMPLEMENTATION_PLAN.md`.

> Keep this accurate as the code evolves. When behavior changes, update the
> corresponding "gotcha"/"model" note here so the next engineer doesn't rediscover
> it the hard way.

---

## 1. What this project is

A web app to track things that expire — licenses, subscriptions, documents,
insurance policies, certificates, etc. Items carry a title, category, expiration
date, and notes. Status (`active` / `expiring_soon` / `expired`) is **derived at
request time**, never stored. The dashboard shows summary counts, a "Needs
Attention" list, and an "Expiring This Week" spotlight.

It launched as an anonymous **live demo**: no accounts, every visitor gets a
private ephemeral room of data, plus an early-bird email waitlist.

---

## 2. Repository layout (pnpm monorepo)

```
ExpiryOS/
├── artifacts/
│   ├── api-server/          # Express 5 REST API (the backend)
│   │   └── src/
│   │       ├── config/      # env-driven thresholds & APP_NAME
│   │       ├── lib/         # sample-data, seed, session, status, logger
│   │       ├── middlewares/ # requireSession, error-handler
│   │       ├── repositories/# IItemsRepository + Drizzle impl, leads
│   │       └── routes/      # items, leads, session, health, index
│   ├── expiry-tracker/      # React 19 + Vite 7 frontend (the /demo UI)
│   │   └── src/             # pages, components, hooks, lib
│   └── mockup-sandbox/      # scratch / throwaway playground
├── lib/
│   ├── api-spec/            # openapi.yaml — single source of truth
│   ├── api-zod/             # code-generated Zod schemas from the OpenAPI
│   ├── api-client-react/    # code-generated TanStack Query hooks
│   ├── db/                  # Drizzle schema + db instance (@workspace/db)
│   └── api/                 # (other shared API helpers as needed)
├── scripts/                 # workspace tooling / scripts package
├── .github/workflows/ci.yml # CI pipeline
└── .env.example             # annotated env reference
```

Workspace packages that matter most: `@workspace/db`, `@workspace/api-zod`,
`@workspace/api-client-react`, `@workspace/api-server`,
`@workspace/expiry-tracker` (the README at times calls it `expiry-os` — the
package was renamed; trust the `@workspace/*` package names).

---

## 3. How the anonymous demo works (the core model)

Every visitor gets a **private room** identified by a random UUID stored in an
`HttpOnly`, `SameSite=Lax`, **no-expiry** session cookie named `expiryos_demo`
(`lib/session.ts`). Because there's no `maxAge`/`expires`, the "room" dies when
the browser (or a private window) closes — a truly ephemeral per-visitor demo
with **zero accounts**.

### Request lifecycle
1. `requireSession` middleware runs on every `/api/*` request.
2. It calls `ensureSession(req, res)` → reads the cookie or mints a new UUID,
   and sets `req.ownerId`.
3. It fires **best-effort, fire-and-forget** sample-data seeding:
   `void seedSessionIfNew(ownerId)` (idempotent — no-op if the room already has
   any item).
4. Routes/repositories then read/write rows scoped by `req.ownerId`.

### The two sample-data paths (important asymmetry)
- **Auto-seed on first visit** (in `requireSession.ts`): runs **fire-and-forget**
  and does **not block** the response. On a cold device the first `GET /items`
  can reach the DB before the seed's inserts land, so the dashboard can render
  **empty on first paint** and never refetch. The seed completes in the
  background, but the UI already drew.
- **"Start a sample" button** → `POST /session/reset` (`routes/session.ts`):
  **awaits** `deleteSessionItems(oldOwner)` and `seedSessionIfNew(newOwner)`
  before responding; the frontend refetches only after the response, so the
  button reliably shows data.

> **Gotcha / known gap:** the *first-visit auto-seed is racy* — a cold device
> can see an empty list. If you're debugging "why no sample data on another
> device," this is the usual culprit, not the schema. To make first load
> deterministic, await seeding for item reads (the `limit(1)` guard keeps it
> cheap once a room already has items).

`POST /api/session/reset` issues a fresh room id, overwrites the cookie, deletes
the old owner's rows, and re-seeds — this powers the in-app **"Start a sample"**
control without closing the browser.

---

## 4. Status computation

`lib/status.ts` exposes `computeStatus(expirationDate)` and `enrichItem(row)`.

- `expired`  → date is before today.
- `expiring_soon` → within `EXPIRING_SOON_DAYS` (default 30).
- `active`   → otherwise.
- `EXPIRING_THIS_WEEK_DAYS` (default 7) feeds the dashboard "this week" bucket.

Status is **derived at request time** — never persisted — via `getSummary()`
reading only the needed `expiration_date` column.

---

## 5. Infrastructure / hosting (the production reality)

The **frontend runs on Netlify** (a static Vite build) and the **API runs on
Render** (Node). They talk over a reverse proxy.

### The critical proxy — `/api/*` → Render
Netlify's `public/_redirects` must send `/api/*` to the Render API host,
otherwise the browser hits static-ish 404s for every API call. **If API calls
fail/degrade, verify this file still points at the live Render URL.**

```text
/api/*  https://<your-render-app>.onrender.com/api/:splat  200
```

### The database is Neon (serverless Postgres)
- `lib/db/src/index.ts` builds a `pg.Pool` from `DATABASE_URL`.
- **Fail-fast startup:** if `DATABASE_URL` is missing it throws immediately
  rather than creating a broken pool. It also sets `connectionTimeoutMillis` /
  `query_timeout` / `idleTimeoutMillis` so a dead DB fails fast instead of
  hanging requests (which read as "site loads slowly").
- Schema lives in `lib/db/src/schema/*` (items, leads). Migrations are applied
  with `pnpm --filter @workspace/db run push` (Drizzle Kit) against Neon.

### Env vars (see `.env.example`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | **Required.** Neon/Postgres connection string |
| `PORT` | API port |
| `NODE_ENV` | `production` → JSON logging |
| `LOG_LEVEL` | Pino level |
| `EXPIRING_SOON_DAYS` | default 30 |
| `EXPIRING_THIS_WEEK_DAYS` | default 7 |
| `APP_NAME` | logging name |
| `FRONTEND_URL` | CORS allow-list (explicit in prod, permissive in dev) |

### `.env` / config
Copy `.env.example` → `.env` and set `DATABASE_URL` + `PORT` at minimum.

---

## 6. CI (GitHub Actions)

`.github/workflows/ci.yml` — job `typecheck-and-test` on `ubuntu-latest`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 24` (match Netlify's runtime so CI
   catches the same bugs prod would see).
   - **Do NOT set `cache: pnpm` here** — setup-node with pnpm caching can't find
     the pnpm binary before corepack provides it (`Unable to locate executable
     file: pnpm`).
3. `corepack enable` + `corepack prepare pnpm@10.30.3 --activate` (uses the
   `packageManager` field).
4. `pnpm install`.
5. `pnpm run typecheck` (recurses into all workspace packages).
6. `pnpm --filter @workspace/api-server test` with `RUN_DB_TESTS: "0"` (DB-backed
   owner-isolation tests skip; CI stays green without provisioning a database).

### TypeScript build-order gotcha (TS6305 / TS6369)
The api-server uses **project references** to `@workspace/db` and
`@workspace/api-zod`, which are `composite` + `emitDeclarationOnly` and emit to
`dist/`. Typechecking the api-server **requires those `dist/*.d.ts` files to
exist**. Use `tsc --build` (not a bare `--noEmit`) so the referenced projects
build first.

- The api-server `typecheck` script is `tsc --build tsconfig.json`.
- **`--build` must be the first CLI argument** — `tsc -p tsconfig.json --build`
  fails with `TS6369: Option '--build' must be the first command line argument`.
- A missing referenced build manifests as a wall of `TS6305` errors plus
  "implicit any" on things like a Drizzle `(tx) =>` callback — those implicit-any
  errors are collateral of the missing `.d.ts`, **not** independent bugs.

---

## 7. Codegen (OpenAPI-first)

`lib/api-spec/openapi.yaml` is the single source of truth. Orval generates:
- `lib/api-zod/` → server-side Zod schemas.
- `lib/api-client-react/` → TanStack Query hooks.

**Never hand-edit the generated files.** Change the `.yaml` and regenerate via
the api-spec package's codegen script, e.g.
`pnpm --filter @workspace/api-spec run codegen`.

---

## 8. Making the live demo "private" and working

Transitioning from a shared "visible to anyone" demo to a per-visitor private
demo involved:

1. **Schema:** `items` gained a `NOT NULL owner_id`; a `leads` table was added.
2. **Migration constraint:** because `owner_id` is `NOT NULL` with no backfill,
   an `items` table already holding rows fails the column migration. The
   intended safe path is to **clear legacy `items` rows** (Neon SQL editor or
   drop table) before/at deploy — this is exactly why the old shared demo data
   was deleted.
3. **Deleting the old shared rows** is what made a fresh room able to get seeded
   (seed guard = "room already has ≥1 item"). It's also what switched the
   product from "everyone shares one set" to "a fresh room per visitor."

### Why "the website works but CI failed" for a while
The live site working depends on **deployed code + live DB schema**; CI failing
is a **separate** code hygiene/build-order concern. They can disagree. Netlify
serves the last successful build even after auto-deploy is disabled, and
DB-side fixes (schema, data) take effect instantly with **no redeploy** — which
is why create-item / email-added / sample data could all work while CI was still
red.

---

## 9. Common operational notes

- **Manual versus auto Netlify deploys:** auto-deploy can be left **off** so
  only intentional builds ship; CI acts as the free gate. Turning auto-deploy off
  doesn't un-serve the last successful build, so a healthy live site stays up
  regardless of CI state.
- **Testing DB-backed owner isolation:** the api-server's DB tests are gated by
  `RUN_DB_TESTS` and skip in CI unless explicitly enabled.
- **Logs:** production uses structured JSON via Pino (`NODE_ENV=production`).
  The api-server returns JSON errors (HTTP 400/401/404/500) via a global error
  handler; Zod validation failures include a `details` object.