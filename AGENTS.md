# AGENTS.md

ExpiryOS — pnpm workspace monorepo: an OpenAPI-first Express 5 API plus a React 19 / Vite SPA for tracking items that expire.

## Commands (run from repo root)

- `pnpm install` — pnpm 10.30.3 via corepack, Node >= 24. Use pnpm, not npm/yarn.
- `pnpm run typecheck` — builds the lib project references, then typechecks every package. This is the primary verification; there is no linter or formatter configured.
- `pnpm --filter @workspace/api-server test` — Vitest unit tests.
  - Single file: `pnpm --filter @workspace/api-server exec vitest run src/lib/status.test.ts`
  - DB-backed tests (`*.owner.test.ts`) only run when `RUN_DB_TESTS=1` and a real `DATABASE_URL` is set; otherwise they skip.
- `pnpm --filter @workspace/db run push` — apply the Drizzle schema to Postgres. There are no migration files; `push` mutates the DB directly.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate client/Zod from the OpenAPI spec.
  - Gotcha: the script ends with `pnpm -w run typecheck:libs`, which is NOT defined in the root `package.json`; generation succeeds but that final step errors. Run `pnpm run typecheck` after instead.

## Dev servers (Windows)

- The API `dev` script uses bash `export NODE_ENV=...` and fails in PowerShell. Build then start explicitly:
  `pnpm --filter @workspace/api-server run build` then `$env:NODE_ENV="development"; pnpm --filter @workspace/api-server run start`
- Frontend: `pnpm --filter @workspace/expiry-os run dev` (Vite; port from `PORT`, default 3000).
- There is NO Vite dev proxy (the README is wrong about this). In dev, set `VITE_API_BASE_URL=http://localhost:<api-port>` or the SPA hits the Vite server and 404s on `/api/*`.

## Package vs directory names (easy to confuse)

- `artifacts/expiry-tracker/` → package `@workspace/expiry-os` (frontend). Docs sometimes call it expiry-os or expiry-tracker.
- `artifacts/api-server/` → `@workspace/api-server` (Express API).
- Workspace packages: `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `scripts`.
- `KNOWLEDGE.md` holds accurate architecture/ops context (anonymous demo, CI, hosting, build-order gotchas). `CONTRIBUTING.md` is marked _under revamping_ — use `README.md` and this file for current commands.

## Architecture (non-obvious)

- `lib/api-spec/openapi.yaml` is the contract. `lib/api-zod` and `lib/api-client-react/src/generated` are Orval-generated — never hand-edit them.
- All item data access goes through `IItemsRepository` in `artifacts/api-server/src/repositories/items.repository.ts`; routes import the `itemsRepository` singleton. Every query/mutation is scoped by `ownerId`.
- Anonymous per-visitor "rooms": `requireSession` mints/reads the `expiryos_demo` HttpOnly cookie → `req.ownerId`, then fire-and-forgets first-visit sample seeding (idempotent — the first `GET /items` can race and render empty). `POST /api/session/reset` awaits reseeding.
- Expiry status (`active` / `expiring_soon` / `expired`) is never stored; it is computed at request time in `lib/status.ts` (`computeStatus` / `enrichItem`). Thresholds live in `src/config/index.ts` — never hard-code them.
- `lib/db/src/index.ts` throws at startup if `DATABASE_URL` is unset.

## Env / deploy

- Copy `.env.example` → `.env`; `DATABASE_URL` and `PORT` are required. `FRONTEND_URL` is required in production or the API refuses to start.
- Deploy: SPA → Netlify (`netlify.toml`), API → Render. Netlify proxies `/api/*` to Render via `artifacts/expiry-tracker/public/_redirects`.
- CI (`.github/workflows/ci.yml`): typecheck → `drizzle-kit push` → Vitest, then a Netlify deploy on `main`. Do NOT add `cache: pnpm` to setup-node — it fails before corepack provides pnpm.

## Build-order gotcha

- api-server uses TS project references to composite libs; typecheck with `tsc --build` (already in the scripts). `--build` must be the first CLI arg. Missing referenced `dist/*.d.ts` surfaces as a wall of TS6305 plus collateral implicit-any errors.