# Project Knowledge — ExpiryOS

This file is the living context for developers working on ExpiryOS. It records
architecture decisions, the anonymous-demo model, the production hosting/release
setup, and the hard-won debugging facts from getting a deployed demo working.
It complements `README.md` (setup, testing, deployment) and `AGENTS.md`
(repo-specific commands and gotchas).

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
│   ├── expiry-tracker/      # React 19 + Vite frontend; package @workspace/expiry-os
│   │   └── src/             # pages, components, hooks, lib
│   └── mockup-sandbox/      # scratch / throwaway playground (not the product)
├── lib/
│   ├── api-spec/            # openapi.yaml — single source of truth
│   ├── api-zod/             # code-generated Zod schemas from the OpenAPI
│   ├── api-client-react/    # code-generated TanStack Query hooks
│   └── db/                  # Drizzle schema + db instance (@workspace/db)
├── scripts/                 # workspace tooling / scripts package
├── .github/workflows/ci.yml # CI pipeline
└── .env.example             # annotated env reference
```

Workspace packages that matter most: `@workspace/db`, `@workspace/api-zod`,
`@workspace/api-client-react`, `@workspace/api-server`, and
`@workspace/expiry-os`.

> **Naming gotcha:** the frontend folder is `artifacts/expiry-tracker/` but its
> package name is `@workspace/expiry-os`. The two names differ on purpose (the
> folder is a legacy Replit artifact path; the package was rebranded to
> ExpiryOS). Trust the `@workspace/*` package names in filters.

---

## 3. How the anonymous demo works (the core model)

Every visitor gets a **private room** identified by a random UUID stored in an
`HttpOnly`, `SameSite=Lax`, **no-expiry** session cookie named `expiryos_demo`
(`artifacts/api-server/src/lib/session.ts`). Because there's no
`maxAge`/`expires`, the "room" dies when
the browser (or a private window) closes — a truly ephemeral per-visitor demo
with **zero accounts**. The cookie is `secure` only in production.

### The cookie is SIGNED — `SESSION_SECRET` is required in production
`ownerId` is the tenancy key for every item query, so the cookie is not just a
claimed UUID. It is `<uuid>.<base64url HMAC-SHA256>` and the signature is
verified in constant time before the id is trusted. Without this, a client that
learned another visitor's room id could set it as its own cookie and read,
modify, or (via `POST /api/session/reset`) delete that room's data.

Consequences worth knowing:
- **The API refuses to start in production without `SESSION_SECRET`.** Generate
  one with `openssl rand -base64 32` and set it in Render's Environment tab.
  Development and test fall back to a fixed, clearly-insecure dev secret.
- **Changing `SESSION_SECRET` invalidates every existing room.** Harmless for
  ephemeral demo rooms, but it is a visible reset.
- **Each environment needs its own secret** — otherwise a staging room would be
  valid on production.

### Request lifecycle
1. `requireSession` middleware runs on every request.
2. It calls `ensureSession(req, res)` → verifies the signed cookie, or mints a
   new UUID and sets a fresh signed cookie. Returns `{ ownerId, isNew }`.
3. **Only when `isNew` is true** does it seed sample data, and it **awaits** the
   seed before calling `next()`.
4. Routes/repositories then read/write rows scoped by `req.ownerId`.

### Sample data (single automatic path)
Sample data is seeded **only** when a request mints a brand-new room, and the
seed is awaited before the request proceeds. Two earlier behaviours were fixed:

- Seeding used to be fire-and-forget, so a cold first `GET /items` could return
  before the inserts landed and the dashboard rendered **empty on first paint**
  with no refetch. Now the first response already includes the sample rows.
- Seeding used to run on *every* request (a cheap "does this room have items?"
  check), which meant a database round-trip per request and let a client trigger
  sample-data inserts just by presenting a fresh cookie value.

> **Gotcha:** if seeding fails, the middleware clears the room cookie so the next
> request mints a fresh room and retries, rather than stranding the visitor in a
> permanently empty room. So a seeding failure manifests as "the room resets"
> rather than as an error message.

> **Cross-replica gotcha:** the in-memory in-flight-seed map only dedupes within
> one process. Seeding therefore takes a transaction-scoped
> `pg_advisory_xact_lock(hashtext(ownerId))` and re-checks inside the
> transaction, so two API replicas cannot each insert a room's 8 rows.

> **Unused endpoint:** `POST /api/session/reset` (`routes/session.ts`) issues a
> fresh room id, overwrites the cookie, deletes the old owner's rows, and
> re-seeds — and it **awaits** the delete+seed before responding. However, the
> frontend has **no in-app reset/"Start a sample" control** (`demo.ts` and
> `demo-banner.tsx` explicitly state this), so nothing currently calls it. The
> endpoint is kept for future use; don't assume the UI uses it.

### Abuse limits (all env-tunable)
The demo is anonymous, so every request can persist rows. Bounds live in
`config/index.ts` and are documented in `.env.example`:

| Limit | Default | Enforced by |
|---|---|---|
| Items per room | 100 | `POST /items` → `409` |
| Requests/IP/window across `/api` | 300 | global limiter in `app.ts` |
| Waitlist signups/IP/window | 5 | `routes/leads.ts` |
| Session resets/IP/window | 10 | `routes/session.ts` |
| Item creations/IP/window | 60 | `routes/items.ts` |

> **Gotcha:** the limiter keeps counters **in process memory**. Behind multiple
> API replicas the effective limit is `max × replicas`. Move the counters to a
> shared store (Redis) before scaling horizontally.
>
> **Gotcha:** the limiters key on `req.ip`, which is only the real client
> address because `app.ts` sets `trust proxy` to exactly `1`. If you add another
> proxy hop, that must be raised, or every client collapses into one bucket (and
> a spoofed `X-Forwarded-For` becomes possible).

---

## 3a. Input validation `lib/validation.ts`

- `expiration_date` must be a **real calendar date** in `YYYY-MM-DD` form.
  `isValidDateOnly` rejects malformed strings *and* impossible dates such as
  `2026-02-31` (which `Date.parse` silently rolls into March).
- **Why this is hand-written rather than `format: date` in the spec:** the Orval
  config sets `useDates: true` with `coerce.body: ['bigint','date']`, so
  `format: date` would generate `zod.coerce.date()` and hand the repository a
  `Date` object instead of the `YYYY-MM-DD` string its column expects. The spec
  uses `pattern`/`maxLength` instead; this module enforces at runtime.
- **Why it fails closed:** `computeStatus` parses with
  `new Date(\`${date}T00:00:00\`)`. For `"banana"` that is `NaN`, and *every*
  comparison against `NaN` is false — so the item would be classified
  **`active`**, i.e. reported as "not expiring". Failing closed matters more
  than the error code.
- `escapeLikePattern` escapes `\`, `%`, and `_` so a search term is matched
  literally. Without it, searching for `%` matched every row. The surrounding
  wildcards the repository adds are intentional.

---

## 4. Status computation

`artifacts/api-server/src/lib/status.ts` exposes `computeStatus(expirationDate)`
and `enrichItem(row)`.

- `expired`  → date is before today.
- `expiring_soon` → within `EXPIRING_SOON_DAYS` (default 30).
- `active`   → otherwise.
- `EXPIRING_THIS_WEEK_DAYS` (default 7) feeds the dashboard "this week" bucket.

Always append `T00:00:00` when constructing a `Date` from a `YYYY-MM-DD` string
to force local-timezone interpretation and avoid a UTC-midnight off-by-one.
Status is **derived at request time** — never persisted — via `getSummary()`,
which reads only the needed `expiration_date` column.

---

## 5. Infrastructure / hosting (the production reality)

The **frontend runs on Netlify** (a static Vite build) and the **API runs on
Render** (Node). They talk over a reverse proxy.

### The critical proxy — `/api/*` → Render
Netlify's `artifacts/expiry-tracker/public/_redirects` sends `/api/*` to the
Render API host, otherwise the browser hits static-ish 404s for every API call.
**If API calls fail/degrade, verify this file still points at the live Render
URL.**

```text
/api/*    https://expiryos-api.onrender.com/api/:splat   200
/*        /index.html   200
```

### Netlify build config
`netlify.toml` (repo root) pins the build:

```toml
[build]
  command = "pnpm --filter @workspace/expiry-os run build"
  publish = "artifacts/expiry-tracker/dist/public"

[build.environment]
  NODE_VERSION = "24"
```

Netlify publishes Vite's `dist/public` (which also contains `_redirects`).

### The database is Neon (serverless Postgres)
- `lib/db/src/index.ts` builds a `pg.Pool` from `DATABASE_URL`.
- **Fail-fast startup:** if `DATABASE_URL` is missing it throws immediately
  rather than creating a broken pool. It also sets `connectionTimeoutMillis` /
  `query_timeout` / `idleTimeoutMillis` so a dead DB fails fast instead of
  hanging requests (which read as "site loads slowly").
- **TLS verification is ON by default** (`lib/db/src/ssl.ts`). Previously any
  non-localhost URL got `rejectUnauthorized: false`, which silently disabled
  certificate verification for every deployment. Opting out now requires an
  explicit `DATABASE_SSL_REJECT_UNAUTHORIZED=false`. Localhost detection parses
  the URL, so `localhost.example.com` is correctly treated as **remote**.
- `closeDb()` closes the pool; `index.ts` calls it during graceful shutdown.
- Schema lives in `lib/db/src/schema/*` (items, leads). Migrations are applied
  with `pnpm --filter @workspace/db run push` (Drizzle Kit) against Neon.
- **Indexes:** `items` has a composite
  `items_owner_id_expiration_date_idx` on `(owner_id, expiration_date)`. It
  serves owner-scoped lookups via its leftmost prefix *and* the list query's
  filter+sort, so no sequential scan and no separate sort step. Run `push` to
  create it.
  > **Not indexed:** the `search` `ILIKE '%term%'` path cannot use a btree
  > index. That would need a `pg_trgm` GIN index, which drizzle-kit does not
  > create for us. Search is therefore bounded by the per-room item cap and the
  > client-side debounce rather than by an index.

### Health checks
`GET /healthz` is served at **both** the root and `/api/healthz` (`app.ts`
mounts the shared `healthCheck` handler in both places). Platform probes
configured either way succeed instead of 404ing — a failing probe can get the
instance recycled. The root route is deliberately outside the `/api` rate
limiter, since probes are frequent and legitimate.

### Graceful shutdown
`index.ts` handles `SIGTERM`/`SIGINT`: stop accepting connections, drain
in-flight requests, close the DB pool, exit `0`. Capped at 10 seconds, and
idempotent (a second signal is ignored). Render sends `SIGTERM` on every deploy,
so without this the process was killed mid-request and its pooled connections
dropped. A bind failure (e.g. `EADDRINUSE`) logs at `fatal` and exits `1`
instead of dying silently.

### Env vars (see `.env.example`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | **Required.** Neon/Postgres connection string |
| `SESSION_SECRET` | **Required in production.** Signs the session cookie; the API refuses to start without it |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Set to exactly `"false"` to disable DB TLS verification (default: verification on) |
| `PORT` | API port |
| `NODE_ENV` | `production` → JSON logging, secure cookies, required secrets |
| `LOG_LEVEL` | Pino level |
| `EXPIRING_SOON_DAYS` | default 30 |
| `EXPIRING_THIS_WEEK_DAYS` | default 7 |
| `APP_NAME` | logging name |
| `FRONTEND_URL` | **Required in production.** CORS allow-list; the API refuses to start without it |
| `MAX_ITEMS_PER_OWNER` | default 100 |
| `RATE_LIMIT_WINDOW_MS` | default 60000 |
| `RATE_LIMIT_MAX_GLOBAL` | default 300 |
| `RATE_LIMIT_MAX_LEADS` | default 5 |
| `RATE_LIMIT_MAX_RESET` | default 10 |
| `RATE_LIMIT_MAX_ITEM_WRITES` | default 60 |

---

## 6. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests.

Job `typecheck-and-test` on `ubuntu-latest`, with an **ephemeral PostgreSQL 16
service** and `RUN_DB_TESTS: "1"`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 24` (match Render/Netlify so CI
   catches the same bugs prod would see).
   - **Do NOT set `cache: pnpm` here** — setup-node with pnpm caching can't find
     the pnpm binary before corepack provides it (`Unable to locate executable
     file: pnpm`).
3. `corepack enable` + `corepack prepare pnpm@10.30.3 --activate` (uses the
   `packageManager` field).
4. `pnpm install`.
5. `pnpm run typecheck` (recurses into all workspace packages).
6. `pnpm --filter @workspace/db run push` (apply the schema to the CI Postgres).
7. `pnpm --filter @workspace/api-server test` with `RUN_DB_TESTS: "1"`, so the
   DB-backed owner-isolation tests (`*.owner.test.ts`) actually run.

Job `deploy-netlify` runs **only after `typecheck-and-test` passes and only on a
push to `main`** (never on a PR). It builds `@workspace/expiry-os` and deploys
`artifacts/expiry-tracker/dist/public` to Netlify. It requires the repository
secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. **If those secrets are
missing, `nwtgck/actions-netlify` exits successfully without deploying**, so a
green check does not by itself prove the live site was updated.

### TypeScript build-order gotcha (TS6305 / TS6369)
The api-server uses **project references** to `@workspace/db` and
`@workspace/api-zod`, which are `composite` and emit to `dist/`. Typechecking the
api-server **requires those `dist/*.d.ts` files to exist**. Use `tsc --build`
(not a bare `--noEmit`) so the referenced projects build first.

- The api-server `typecheck` script is `tsc --build tsconfig.json`.
- **`--build` must be the first CLI argument** — `tsc -p tsconfig.json --build`
  fails with `TS6369: Option '--build' must be the first command line argument`.
- A missing referenced build manifests as a wall of `TS6305` errors plus
  "implicit any" on things like a Drizzle callback — those implicit-any errors
  are collateral of the missing `.d.ts`, **not** independent bugs.

---

## 7. Codegen (OpenAPI-first)

`lib/api-spec/openapi.yaml` is the single source of truth. Orval generates:
- `lib/api-zod/` → server-side Zod schemas.
- `lib/api-client-react/` → TanStack Query hooks.

**Never hand-edit the generated files.** Change the `.yaml` and regenerate via
`pnpm --filter @workspace/api-spec run codegen`.

> **Caveat:** the codegen script ends with `pnpm -w run typecheck:libs`, which is
> **not defined** in the root `package.json`. Generation succeeds but that final
> step errors — run `pnpm run typecheck` afterwards instead.

> **Spec drift:** `openapi.yaml` documents the reset endpoint as `POST /session`,
> but the server implements `POST /session/reset`. The generated reset hook is
> therefore not wired up.

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

## 9. Local development

- **No Vite dev proxy.** Despite what older docs said, `vite.config.ts` has no
  `server.proxy`. Locally the SPA calls `/api/*` on its own origin, so set
  `VITE_API_BASE_URL=http://localhost:<api-port>` (e.g. `http://localhost:3001`)
  before starting Vite, or those requests 404. This was the root of the
  "delete button doesn't work locally" symptom.
- **`.env` is not auto-loaded.** There is no `dotenv` dependency; processes read
  `process.env` directly. Provide vars via the shell or an explicit `--env-file`.
- **The API `dev` script is bash-only.** `artifacts/api-server/package.json`
  uses `export NODE_ENV=development && ...`, which fails in PowerShell. On
  Windows, build then `start` with `NODE_ENV` set in the shell (see README).
- **Port overlap.** Both the API (`process.env.PORT || 5000`) and Vite
  (`process.env.PORT || 3000`) read `PORT`; don't export the same value in both
  terminals.

---

## 10. Common operational notes

- **Manual versus auto Netlify deploys:** auto-deploy can be left **off** so
  only intentional builds ship; CI acts as the free gate. Turning auto-deploy off
  doesn't un-serve the last successful build, so a healthy live site stays up
  regardless of CI state.
- **DB-backed owner isolation tests:** gated by `RUN_DB_TESTS=1` + a real
  `DATABASE_URL`. They run in CI (Postgres is provisioned); locally they skip
  unless you set both.
- **Logs:** production uses structured JSON via Pino (`NODE_ENV=production`)
  through the shared logger in `lib/logger.ts`. The api-server returns JSON
  errors via a global error handler that **honours the error's `status`**: a
  malformed JSON body is a `400` and an oversized body a `413` (both were
  reported as `500` before), with 4xx logged at `warn` and 5xx at `error`.
  Responses stay generic so internal details never leak. Zod validation failures
  include a `details` object.
- **204 responses:** `DELETE /api/items/:id` returns `204 No Content` with an
  empty body. The client's `parseResponse` special-cases 204/205 — do not add an
  unconditional `response.json()` or the delete toast will regress.
- **Client retries:** `custom-fetch.ts` retries exactly once, and only on a
  *quick* network failure (Render cold-booting and dropping the first
  connection). It deliberately does **not** retry after a request has consumed
  the 60-second timeout — doing so doubled a cold-boot wait to 120s. HTTP errors
  and caller aborts are never retried.
- **UI thresholds:** the spotlight CTA uses the server's `expiring_this_week`
  count rather than re-deriving a 7-day window in the browser, so changing
  `EXPIRING_THIS_WEEK_DAYS` cannot desync the UI. `StatusBadge`'s 60-day
  countdown cap is a *display* choice only — it is not an expiry threshold.
- **List filters live in the URL:** wouter matches on pathname only, so
  `?status=expired` → `/demo/items` does **not** remount the list.
  `useItemFilters` re-syncs `status` from the query string on every change; the
  parsing itself is a pure function in `lib/item-filters.ts`.
- **Search is debounced** (300 ms, `hooks/use-debounced-value.ts`) and LIKE
  metacharacters are escaped server-side. Both exist because each request is an
  unindexed `%term%` scan.
- **Stale historical reports:** `CI_INCIDENT_LOG.md`,
  `DELETE_BUTTON_INVESTIGATION.md`, and `IMPLEMENTATION_PLAN.md` are
  point-in-time records kept for history; they may describe superseded states.
  `CONTRIBUTING.md` is marked _under revamping_.