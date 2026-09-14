### CI Pipeline (`.github/workflows/ci.yml`)

The CI pipeline runs on every push to `main` and on pull requests. It performs the following steps:
1.  **Node.js Setup**: Uses Node.js v24.
2.  **pnpm Enable**: Activates `pnpm` via `corepack`.
3.  **Install Dependencies**: Runs `pnpm install`.
4.  **Typecheck**: Executes `pnpm run typecheck` across all workspace packages.
5.  **Database Schema Application**: Applies the Drizzle schema using `pnpm --filter @workspace/db run push`.
6.  **Unit + DB Integration Tests**: Runs `pnpm --filter @workspace/api-server test`. DB-gated tests are enabled by provisioning an ephemeral PostgreSQL service.

#### Gated Netlify Deployment

A new `deploy-netlify` job has been added to the CI pipeline. This job is configured to:
-   Run only after the `typecheck-and-test` job successfully completes.
-   Execute only on pushes to the `main` branch.
-   Build the web application (`@workspace/expiry-os`) using `pnpm --filter @workspace/expiry-os run build`.
-   Deploy the built application to Netlify from the `artifacts/expiry-tracker/dist/public` directory.
-   Requires `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as GitHub repository secrets.

This ensures that only code that has passed all CI checks is deployed to Netlify, preventing the deployment of broken code and conserving Netlify build minutes.

### Netlify Configuration (`netlify.toml`)

A `netlify.toml` file has been added to the repository root to configure Netlify builds:
```toml
[build]
  command = "pnpm --filter @workspace/expiry-os run build"
  publish = "artifacts/expiry-tracker/dist/public"

[build.environment]
  NODE_VERSION = "24"
```
This configuration explicitly tells Netlify:
-   To use `pnpm` to build the `@workspace/expiry-os` package.
-   To publish the contents of `artifacts/expiry-tracker/dist/public`.
-   To use Node.js version 24 for the build environment.

---

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