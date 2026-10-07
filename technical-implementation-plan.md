# Technical Implementation Plan — Agent Execution Document

**Scope:** D-001 through D-007 only. D-008 and D-009 are direction-only and are excluded.
**Source of truth:** `decision documentation.md` (repo root).
**Language note:** this document is intentionally technical. It is written for the executing agent, not for the product owner.

---

## Preconditions

- Branch per PR. Never branch from a dirty tree — see PR 0.
- Working directory: `C:\Users\LENOVO\Desktop\Programming\expiryos\ExpiryOS`
- Primary verification gate: `pnpm run typecheck` (root). Secondary: package test suites.
- No linter or formatter is configured in this repo. Match surrounding style manually.
- No migration files exist. Schema changes would require `pnpm --filter @workspace/db run push`. **No PR in this plan touches the schema.**

---

## PR 0 — Line-ending normalization (D-007)

**Rationale:** `core.autocrlf=true` is set in this clone. `git status` reports ~150 modified files while `git diff --stat` reports zero line changes. Every subsequent PR is unreviewable until this is resolved.

### Steps

1. Create `.gitattributes` at repo root:

```
* text=auto eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.svg text eol=lf
*.woff binary
*.woff2 binary
*.pdf binary
```

2. Set local git config so Windows checkouts stop reintroducing CRLF:

```
git config core.autocrlf false
```

3. Renormalize and commit in isolation:

```
git add .gitattributes
git add --renormalize .
git commit -m "chore(repo): normalize line endings to LF via .gitattributes"
```

4. Confirm nothing else rode along:

```
git show --stat HEAD
```

Expect a large file count in this one commit only. That is intended.

### Verification

- `git status --porcelain` returns empty.
- `git diff HEAD~1 --stat -- artifacts/expiry-tracker/src/App.tsx` shows no content change beyond EOL metadata.

### Risk

`git add --renormalize .` will also stage any genuine uncommitted work present in the tree. **Before starting, confirm with `git stash list` and `git status` that no real work is at risk.** If real work exists, stop and ask the owner to commit or stash it first.

### Revert

`git revert` the commit. `.gitattributes` is inert on its own.

---

## PR 1 — CI deploy honesty (D-005) — SHIP FIRST

**Rationale:** nothing else reaches users until this lands. This PR ships the already-written delete fix.

**No application logic changes in this PR.** The delete fix already exists in `lib/api-client-react/src/custom-fetch.ts` (`parseResponse`, landed in `2bdca69`). `lib/api-client-react/package.json` exports `"." : "./src/index.ts"`, so Vite bundles it from source. The bundle is stale purely because the deploy step no-ops.

### File: `.github/workflows/ci.yml`

1. In the `nwtgck/actions-netlify@v3` step, add to the `with:` block:

```yaml
fails-without-credentials: true
```

This is the root cause. The action defaults this to `false` and exits 0 when `NETLIFY_AUTH_TOKEN` or `NETLIFY_SITE_ID` is absent, producing a green job that deploys nothing.

2. After the deploy step, add a smoke step:

```yaml
- name: Verify deployed site
  run: |
    curl --fail --silent --show-error --retry 5 --retry-delay 5 --retry-all-errors \
      https://expiryos.netlify.app/api/session
```

3. Add a stale-bundle tripwire immediately after "Build web app", before the deploy step. This fails the build if the output artifact reverts to the known-bad bundle:

```yaml
- name: Guard against stale bundle
  run: |
    if grep -q "index-C2cMtcLG.js" artifacts/expiry-tracker/dist/public/index.html; then
      echo "Built index.html still references the known-stale bundle index-C2cMtcLG.js"
      exit 1
    fi
```

### Verification

1. Push to `main`.
2. Watch the run. Confirm the deploy step reports an actual deploy, not `not deployable`.
3. `curl -s https://expiryos.netlify.app/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'` must not return `index-C2cMtcLG.js`.
4. Manual: open `/demo/items`, delete an item. Expect HTTP 204, a success toast, and the row disappearing with no page reload.

### Revert

Single-file revert. Harmless to keep even if reverted.

---

## PR 2 — Extract response parsing + regression tests (D-004 hardening)

**Rationale:** the 204 guard shipped once without a test and broke production for weeks. This PR makes that class of bug impossible to reintroduce silently.

### New file: `lib/api-client-react/src/response.ts`

Move `parseResponse` out of `custom-fetch.ts` verbatim. Also export a named predicate so the status logic is independently testable:

```ts
export const EMPTY_BODY_STATUSES = [204, 205] as const;

export function isEmptyStatus(status: number): boolean {
  return EMPTY_BODY_STATUSES.includes(status as (typeof EMPTY_BODY_STATUSES)[number]);
}

export const parseResponse = async <T>(response: Response): Promise<T> => { /* moved body */ };
```

Keep the existing behaviour exactly: 204/205 → `undefined`; empty text → `undefined`; valid JSON → parsed; invalid JSON → `throw new Error(\`Invalid JSON response body (status ${response.status})\`)`.

### Modify: `lib/api-client-react/src/custom-fetch.ts`

Delete the local `parseResponse` definition. Add `import { parseResponse } from "./response";`. No other behavioural change.

### New file: `lib/api-client-react/src/response.test.ts`

Cases, all mandatory:

| # | Input | Expected |
|---|---|---|
| 1 | status 204, `json()` rejects | resolves `undefined`, no throw |
| 2 | status 205, `json()` rejects | resolves `undefined`, no throw |
| 3 | status 200, empty text | resolves `undefined` |
| 4 | status 200, valid JSON object | resolves the parsed value |
| 5 | status 200, malformed text | throws `Invalid JSON response body` |
| 6 | `isEmptyStatus` across 200/204/205/404/500 | true only for 204, 205 |

Use a `Response` stub cast to the DOM `Response` type, or construct via `new Response(body, { status })` — note that the `Response` constructor throws for 204/205 with a non-null body, so pass `null` for those cases.

Import `describe`/`it`/`expect` explicitly from `vitest`. Do **not** rely on globals; `lib/api-client-react/tsconfig.json` does not set `types`, so explicit imports avoid config drift.

### Modify: `lib/api-client-react/package.json`

```json
"scripts": {
  "build": "tsc --build tsconfig.json",
  "typecheck": "tsc --build tsconfig.json",
  "test": "vitest run"
},
"devDependencies": {
  "vitest": "^2.1.9"
}
```

Pin `^2.1.9` to match `artifacts/api-server/package.json`. Do not introduce a catalog entry; the workspace catalog does not currently define vitest and adding one is out of scope.

Run `pnpm install` after editing so the lockfile updates.

### tsconfig decision

`lib/api-client-react/tsconfig.json` has `include: ["src"]` and `composite: true`. Test files inside `src` will therefore be typechecked and will emit `.d.ts` files into `dist/`.

**Recommendation: accept this.** `artifacts/api-server/tsconfig.json` uses the same convention (tests in `src`, typechecked). Consistency with the existing repo pattern outweighs the cosmetic `.d.ts` output.

### Modify: `.github/workflows/ci.yml`

Broaden the test step so the new suite actually runs:

```yaml
- name: Unit + DB integration tests
  run: pnpm -r --if-present run test
  env:
    RUN_DB_TESTS: "1"
```

This covers `@workspace/api-server` and `@workspace/api-client-react` in topological order. The DB service and `RUN_DB_TESTS` env stay as they are.

### Verification

```
pnpm --filter @workspace/api-client-react test
pnpm --filter @workspace/api-server test
pnpm run typecheck
```

All three must pass locally before pushing.

---

## PR 3 — Frontend mutation hooks (D-006 structural)

**Rationale:** mutation logic, toast copy, and cache keys are currently inline in two page components. That coupling is why the delete bug was expensive.

### New file: `artifacts/expiry-tracker/src/hooks/use-item-mutations.ts`

Own two flows. Each wraps the generated Orval hook and centralises invalidation + user-facing copy.

```ts
export function useDeleteItemFlow() { /* returns { mutate, isPending } */ }
export function useSaveItemFlow()   { /* returns { create, update, isPending } */ }
```

Both must invalidate, via the `useQueryClient` instance:
- `{ queryKey: ["/api/items"] }` — prefix invalidation refreshes every filtered/sorted variant.
- `{ queryKey: getGetItemsSummaryQueryKey() }`

Error copy must read the thrown message, so the server's `error` string surfaces instead of a generic string.

### Modify: `artifacts/expiry-tracker/src/pages/items-list.tsx`

Remove `handleDelete` and its inline `mutate` options. Call `useDeleteItemFlow()`. The page renders; it no longer knows about toasts or query keys.

Keep `e.stopPropagation()` in the click handler. Do **not** reintroduce `e.preventDefault()` — `7c1d626` removed it deliberately, and calling it inside `AlertDialogAction` suppresses Radix's close behaviour.

### Modify: `artifacts/expiry-tracker/src/pages/item-form.tsx`

Same treatment: replace the three inline `mutate` call sites (create success/error, update success/error) with `useSaveItemFlow()`.

### Verification

```
pnpm run typecheck
pnpm --filter @workspace/expiry-os run build
```

Manual: delete an item, create an item, edit an item. Toasts fire once each. Lists refresh without a reload.

---

## PR 4 — Seed module extraction + flag (D-001, D-002, D-003)

**Rationale:** the behavioural change. Isolated in its own PR because it alters what every visitor sees.

### New folder: `artifacts/api-server/src/seed/`

Four files, one responsibility each.

**`date-offset.ts`** — move `dayOffsetISO` verbatim from `lib/sample-data.ts`. Pure, no imports.

**`sample-items.ts`** — move the `SampleItemSpec` interface, `SAMPLE_SPECS`, and `generateSampleItems`. Import type only:

```ts
import type { CreateItemData } from "../repositories/items.repository";
```

Path adjusts from `../repositories/...` to `../../repositories/...`.

**`lock.ts`** — wrap the advisory lock so the SQL string exists in exactly one place:

```ts
export async function withRoomLock<T>(tx: Tx, ownerId: string, fn: () => Promise<T>): Promise<T>
```

Implementation must keep `pg_advisory_xact_lock(hashtext($1))` executed inside the caller's transaction, so Postgres releases it on commit or rollback. Do not move it to a session-level lock.

**`index.ts`** — the only public surface. Exports `seedRoomIfEmpty(ownerId)` and `clearRoom(ownerId)`. **The flag check lives here**, so no caller needs to know about it:

```ts
export async function seedRoomIfEmpty(ownerId: string): Promise<void> {
  if (!SEED_SAMPLE_DATA) return;   // flag default: false
  /* existing seedForOwner body */
}
```

Move `inFlightSeeds` and the `seedSessionIfNew` in-flight dedupe into this file, renamed. Preserve the `finally` guard that compares the stored promise by identity before deleting, so a newer attempt is not evicted.

Preserve the two-phase structure: an unlocked fast-path `SELECT ... LIMIT 1` to avoid opening a transaction for the common case, then the locked re-check inside the transaction.

**Delete after migration:**
- `artifacts/api-server/src/lib/seed.ts`
- `artifacts/api-server/src/lib/sample-data.ts`
- `artifacts/api-server/src/lib/sample-data.test.ts` → moves to `src/seed/sample-items.test.ts`, import path updated.

### Modify: `artifacts/api-server/src/config/index.ts`

`positiveInt` is module-private and unsuitable for a boolean. Add a sibling helper and the new flag:

```ts
function booleanEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

/** Seed sample items into brand-new anonymous rooms.
 *  Controlled by SEED_SAMPLE_DATA. @default false */
export const SEED_SAMPLE_DATA = booleanEnv(process.env.SEED_SAMPLE_DATA, false);
```

Default **false**. Invalid values fall back rather than throwing, matching the existing tolerance style in this file.

### Modify: `artifacts/api-server/src/middlewares/requireSession.ts`

Becomes synchronous and database-free:

```ts
const requireSession: RequestHandler = (req, res, next): void => {
  const { ownerId } = ensureSession(req, res);
  req.ownerId = ownerId;
  next();
};
```

Remove:
- the `seedSessionIfNew` import
- the `logger` import
- the `clearSession` import
- the `isNew` branch, the `await`, and the self-heal error path

`clearSession` remains exported from `lib/session.ts` — `routes/session.ts` and future code may need it. Only the middleware's usage goes.

Rewrite the module docblock. The current text describes seeding as a responsibility; that is now false. Note instead that the middleware only guarantees `req.ownerId`.

The `declare global` block for `Express.Request.ownerId` must be preserved verbatim. It is load-bearing for typechecking every route.

`ensureSession` still returns `isNew`, and `lib/session.ts` needs no change. The field becomes unused by the middleware but stays part of the contract and is covered by `lib/session.test.ts`.

### Modify: `artifacts/api-server/src/routes/session.ts`

No structural change. The reset route already calls `setSessionCookie`, `deleteSessionItems`, and `seedSessionIfNew`; rename the latter two to `clearRoom` / `seedRoomIfEmpty`.

Behaviour with the flag off: reset mints a new room, clears the old room's rows, and skips seeding. The visitor gets an empty room. That is correct.

Update the file docblock — it currently promises the new room "is immediately seeded with fresh sample data", which is now conditional.

Also remove the now-inaccurate reset rate-limit comment if its rationale referenced eight inserts unconditionally. The limiter itself stays.

### New test: `artifacts/api-server/src/seed/seed-flag.test.ts`

Cover `booleanEnv` semantics through the exported flag's parsing rules: unset → false, `"true"`/`"1"` → true, `"false"`/`"0"` → false, garbage → false. `booleanEnv` is module-private, so either export it for testing or test via a small table-driven harness over the same input set.

### No OpenAPI change

`POST /session/reset` and `DELETE /items/{id}` contracts are unchanged. **Do not run `pnpm --filter @workspace/api-spec run codegen`.** Regenerating is unnecessary churn and carries the known broken trailing script noted in `AGENTS.md`.

### Verification

```
pnpm --filter @workspace/api-server test
pnpm run typecheck
```

Then local runtime proof. Build and start the API per `AGENTS.md` (the `dev` script uses bash `export` and fails in PowerShell):

```
pnpm --filter @workspace/api-server run build
$env:NODE_ENV="development"; pnpm --filter @workspace/api-server run start
```

With a cookie-less client, `GET /api/items` must return an empty list, and the `items` table must gain **zero** rows for that request. Confirm by querying `select owner_id, count(*) from items group by owner_id` before and after.

---

## PR 5 — Empty-room UX (D-001 completion, D-009 direction)

**Depends on PR 4.** Meaningless before rooms are actually empty.

Out of the original D-001..D-007 gate; included here because it is the compensating half of removing seeding and the owner has already accepted its direction.

### New file: `artifacts/expiry-tracker/src/hooks/use-room-is-empty.ts`

Single source of truth for "is this room empty", so `dashboard.tsx` and `items-list.tsx` cannot disagree. Must distinguish **empty** from **loading**, or the empty state flashes on every page load.

### New file: `artifacts/expiry-tracker/src/components/first-run/first-run-empty.tsx`

Three steps maximum, ending in a link to `/demo/items/new`. Plus a secondary "Load example items" button calling the generated `resetSession`.

That button is the only sanctioned path to sample rows while `SEED_SAMPLE_DATA` is off. **It must be hidden when the flag is off**, otherwise it silently produces an empty room and lies to the user. The flag is server-side and not exposed to the SPA, so either expose it on `GET /api/session` (requires an OpenAPI change plus codegen) or omit the button for now and add it in a later PR with the flag turned on. **Recommendation: omit for now.** Do not widen the API surface inside a UI PR.

### Modify: `artifacts/expiry-tracker/src/pages/dashboard.tsx`, `items-list.tsx`

Render the component when the room is empty and not loading. Leave the existing loading skeletons untouched.

### Verification

`pnpm run typecheck`, `pnpm --filter @workspace/expiry-os run build`. Then manual: clean cookie → first-run card renders → add first item → dashboard populates.

---

## PR 6 — Documentation sync (D-004, D-001)

### Modify: `AGENTS.md`

The Architecture section states that `requireSession` "seeds sample data only when the room is new, awaiting it before proceeding". That is now false. Rewrite to state that rooms start empty and the middleware performs no database work.

### Modify: `KNOWLEDGE.md`

Same correction. Add `SEED_SAMPLE_DATA` to any env var listing.

### Modify: `DELETE_BUTTON_INVESTIGATION.md`

Mark resolved, with a link to the shipping commit. **Delete the `e.preventDefault()` / modal row** — it is stale. Commit `7c1d626` fixed it and the current source calls only `e.stopPropagation()`. Leaving it will send a future reader after a bug that no longer exists.

### Modify: `.env.example` and `README.md`

Add `SEED_SAMPLE_DATA` with a note that it is off by default and exists so operators can demo with example data.

---

## PR 7 — Interactive Onboarding, Early Access Polish, Calendar & Form UX

**Rationale:** Address user feedback regarding first-run onboarding interactivity, waitlist discoverability, calendar popover layout collapse, and item creation ergonomics.

### Modify: `artifacts/expiry-tracker/src/components/ui/calendar.tsx`
- **Issue:** `react-day-picker` v9 inside `PopoverContent className="w-auto p-0"` had no container width and table cells lacked individual widths, causing browser layout collapse where weekdays (`SuMoTuWeThFrSa`) and date numbers collided.
- **Fix:** Fixed width `w-[280px]` on the root calendar container, `w-9 text-center` for weekday cells, and `h-9 w-9` buttons for day cells with explicit selection and hover styles.

### Modify: `artifacts/expiry-tracker/src/components/first-run/first-run-empty.tsx`
- **Interactive Onboarding Walkthrough:**
  - **Step 1:** Interactive item presets (*Passport*, *Car Insurance*, *Domain Name*, *Streaming*) that update a live item card preview.
  - **Step 2:** Interactive status calculation demo demonstrating how Active (>30d), Expiring Soon (≤30d), and Expired compute continuously.
  - **Step 3:** Actionable choice between loading 4 sample items and creating a new custom item.
  - **Skippable & Persistent:** Clean "Skip tutorial" button in the header; dismissed state saved to `sessionStorage` (`expiryos_tutorial_skipped`) with a one-click option to replay the tour.

### Modify: `artifacts/expiry-tracker/src/components/demo-banner.tsx`, `layout.tsx`, `landing.tsx`, `items-list.tsx`
- **Early Access Discoverability & Gentle Push:**
  - In `demo-banner.tsx`: Added a `✨ Get Early Access` pill button in the top banner across all views.
  - In `layout.tsx`: Elevated the muted text link into a prominent Early Access card in the desktop sidebar footer; added 1-tap waitlist action on mobile bottom navigation; cleaned up redundant "Add Item" button clutter.
  - In `landing.tsx`: Elevated waitlist button to a primary hero CTA alongside "Start the demo".
  - In `items-list.tsx`: Added a dismissible gentle nudge at the end of the item list explaining upcoming email & WhatsApp alerts.

### Modify: `artifacts/expiry-tracker/src/pages/item-form.tsx`
- **Category Suggestion Chips:** Quick-pick suggestion pills (*Documents*, *Subscriptions*, *Insurance*, *Software*, *Warranties*, *Health*) beneath the category input for frictionless entry.

---

## Appendix — evidence anchors

Facts verified during planning. Re-verify before acting on each.

| Fact | How it was established |
|---|---|
| Live bundle is `index-C2cMtcLG.js` and ends its fetch with `return await h.json()` | Fetched `https://expiryos.netlify.app/` then the asset; searched for `Invalid JSON response body` (absent) and `204` (only a bitmask constant) |
| `parseResponse` already exists in source | Read `lib/api-client-react/src/custom-fetch.ts` lines 41–56 |
| Fix predates the live bundle | `git log -S parseResponse -- lib/api-client-react/src/custom-fetch.ts` → `2bdca69`, 2026-08-29 |
| Deploy action exits 0 without credentials | `fails-without-credentials` defaults to `false`; no such key in `.github/workflows/ci.yml` |
| Vite bundles the client from TypeScript source | `lib/api-client-react/package.json` → `"exports": { ".": "./src/index.ts" }` |
| Working tree noise is CRLF, not content | `git diff --stat -- artifacts/expiry-tracker/src/App.tsx` empty while `git status` lists the file; `git config core.autocrlf` → `true` |
| `lib/api-client-react` has no test runner | No `test` script, no `vitest` dependency |
| `positiveInt` cannot express booleans | Module-private, rejects non-integers |