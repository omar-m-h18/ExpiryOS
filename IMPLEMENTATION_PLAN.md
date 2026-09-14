# Implementation Plan

## Overview

Fix the "Failed to delete item" toast that appears even though the DELETE request returns **204 No Content** and the item is actually deleted server-side — by getting the already-correct frontend source actually deployed, plus one minimal config file so Netlify deploys deterministically.

**Root cause (proven from the live deployed bundle, not guessed):** The `expiryos.netlify.app` site serves an **old JavaScript bundle** (`/assets/index-C2cMtcLG.js`) whose success path for DELETE still does `return await h.json()` with **no 204/205 guard**. A 204 response has an empty body, so `response.json()` throws `SyntaxError: Unexpected end of JSON input`, which surfaces through React Query's `onError` as the toast **"Failed to delete item"** — even though the server already deleted the item.

Evidence from the deployed bundle:
```
...a,headers:d,signal:c});if(!h.ok){const p=await h.json().catch(...);throw new Error(...)}
return await h.json()}finally{clearTimeout(o)}
```
i.e. **every successful response is `.json()`'d unconditionally.** The repo's current `custom-fetch.ts` fixes this with `parseResponse` (`=== 204 || === 205 → return undefined`, plus empty-text guard), but that code is **not what is deployed**: the deployed bundle contains `application/json`, `VITE_API_BASE_URL`, `credentials`, and `AbortSignal` markers (an *intermediate* revision) but does **not** contain the `Invalid JSON response body` string that only exists in the current `parseResponse`.

**Scope / approach:** The backend is fixed and correct (returns 204 on matched id+owner, verified by the network capture). The frontend source is already correct. The only defect is that the **deployed frontend predates the fix and Netlify has no deploy configuration** (`netlify.toml` absent; no CI workflow gated-deploy step) that would rebuild the web SPA from current source — which is why redeploys to date have not reflected the fix. The smallest correct fix is (1) add a minimal `netlify.toml` so Netlify builds the right package and publishes the right directory, and (2) deploy through a **GitHub Actions workflow that only deploys after the checks pass**, so no credits are wasted on broken code. Everything runs in the cloud — **no local build or disk usage**. No source logic changes any of the already-correct files.

**No existing source code needs editing.** `custom-fetch.ts`, `items-list.tsx`, the generated hooks, and the backend repository are all already correct. Making up a source change here would be wrong (YAGNI / ponytail).

---

## Types

**No type system changes.** The existing `parseResponse<T>` generic return (`undefined as unknown as T` for 204/205) is correct and requires no type changes. No new interfaces, enums, or data structures.

---

## Files

### New: `/netlify.toml` (repository root)

The one code-level change. Netlify has no build configuration today, so manual/deployed builds do not reliably rebuild the frontend from current source. Add a deterministic config:

```toml
[build]
  command = "pnpm --filter @workspace/expiry-os run build"
  publish = "artifacts/expiry-tracker/dist/public"

[build.environment]
  NODE_VERSION = "24"
```

Notes:
- The web package name is `@workspace/expiry-os` (folder `artifacts/expiry-tracker`), confirmed in `artifacts/expiry-tracker/package.json`.
- Root `package.json` declares `packageManager: pnpm@10.30.3`, so Netlify installs with pnpm and resolves the `@workspace/api-client-react` workspace package from current source (all lib pkgs export `./src/index.ts` directly — no prebuild needed).
- Vite `outDir` is `dist/public` (see `vite.config.ts`), so `publish` points there; Netlify copies `_redirects` from `public/` into the publish dir.
- `NODE_VERSION = "24"` satisfies the root `engines.node: ">=24"`.

### Modified: `.github/workflows/ci.yml` — add a `deploy-netlify` job

Gated deploy so GitHub Actions becomes the quality gate (never waste Netlify credits on broken code):
- `needs: typecheck-and-test` — deploys only if tests + typecheck pass.
- `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` — never runs on pull_request or failed checks.
- Installs deps, builds the web app, then runs `nwtgck/actions-netlify@v3` with `publish-dir: artifacts/expiry-tracker/dist/public` and `production-deploy: true`.
- Requires repo secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

### Unchanged (verified correct — do not edit)
- `lib/api-client-react/src/custom-fetch.ts` — already has the `parseResponse` 204/205 fix.
- `artifacts/expiry-tracker/src/pages/items-list.tsx` — delete flow/onError/is correct.
- `artifacts/api-server/src/repositories/items.repository.ts` — already uses `and()` (204 returned only on real delete).
- Generated Orval hooks (`lib/api-client-react/src/generated/api.ts`) — correct.

---

## Functions

**No function additions or modifications.** The fix is already present in source (`parseResponse`, `performRequest`, `customFetch`). The only thing not shipped is the *build*. No function-level change is required or desirable.

---

## Classes

**No class changes.** The React components and hooks involved require no modification.

---

## Dependencies

**No new runtime or dev dependencies.** Uses only pnpm (already the package manager) and existing workspace packages. No package version changes.
---

## Testing

1. **CI gate (GitHub Actions, cloud):** pushing to `main` runs `typecheck-and-test` (existing ci.yml). The new `deploy-netlify` job uses `pnpm --filter @workspace/expiry-os run build`; it must exit 0 and emit `artifacts/expiry-tracker/dist/public/assets/index-<hash>.js`. Deploy runs only if this build succeeds.
2. **Bundle content check (cloud, read-only):** after the deploy, fetch the new bundle and confirm it:
   - contains `Invalid JSON response body` (the `parseResponse` message) or a `204`/`205` status compare;
   - no longer contains the unconditional success path `return await h.json()` without a guard.
3. **Existing unit tests:** `lib/api-client-react/src/custom-fetch.test.ts` already covers `parseResponse` 204/205 (runs in CI's api-server test step). No test changes needed.
4. **Deployed verification:** after the deploy, fetch `https://expiryos.netlify.app/`, confirm the JS asset hash **differs** from `index-C2cMtcLG.js`, fetch that new bundle, confirm it contains the 204 guard, then a hard-refresh browser DELETE shows **"Item deleted successfully"** and the item vanishes.

---

## Implementation Order

1. **Add `/netlify.toml`** — build command (`pnpm --filter @workspace/expiry-os run build`), publish dir, Node 24 (done).
2. **Add `deploy-netlify` job** to `.github/workflows/ci.yml`, gated on the existing checks passing, main-push only (done).
3. **Set Netlify repo secrets** in the GitHub repo *Settings → Secrets and variables → Actions*: `NETLIFY_AUTH_TOKEN` (personal access token from Netlify user settings) and `NETLIFY_SITE_ID` (site API ID).
4. **Commit + push** `netlify.toml` and `.github/workflows/ci.yml` to `main`. GitHub Actions builds + tests, and only on success deploys to Netlify from `artifacts/expiry-tracker/dist/public`.
5. **Verify the live site** now serves a new bundle containing the 204 guard (Testing step 4), then hard-refresh (Ctrl+Shift+R) or use an incognito window and confirm the delete toast is now a success.