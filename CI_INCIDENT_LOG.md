# CI Incident Log — Resolving Typecheck & Monorepo Build Pipeline

**Status:** ✅ RESOLVED — CI Passing  
**Impact:** GitHub Actions CI workflow (`typecheck-and-test` & `deploy-netlify`)  
**Resolution Date:** September 15, 2026  

---

## Executive Summary

The GitHub Actions CI pipeline was failing during `pnpm run typecheck`, blocking automated testing and gated Netlify production deployments. Through systematic diagnosis and remote verification (using GitHub Actions as a zero-disk-space test runner), we identified and resolved three distinct architectural and type issues across the monorepo:

1. **Backend Drizzle ORM Condition Narrowing:** An unhandled `undefined` return type from `or(...)` in the repository layer.
2. **Monorepo Project References Gap:** Shared libraries (`@workspace/api-client-react`) were not built prior to frontend typechecking, causing a cascade of missing `.d.ts` files (`TS6305`) and inferred `any` types (`TS7006`).
3. **Web Standards `AbortSignal` Nullability:** Browser `RequestInit.signal` can be `null`, which violated `AbortSignal.any()`'s strict parameter types (`TS2322`).

Once all three fixes were applied, the root build and package-level typechecks passed cleanly with exit code 0.

---

## Incident Timeline & Detailed Root Causes

```
[Issue 1: items.repository.ts]
   ├── Error: TS2345 (SQL | undefined not assignable to SQL)
   └── Fix: Guard searchFilter with truthiness check before pushing to conditions
         │
         ▼
   [api-server typecheck: Done]
         │
         ▼
[Issue 2: Project Reference Orphan]
   ├── Error: TS6305 (lib/api-client-react/dist/index.d.ts not built)
   │   └── Cascade: TS7006 (implicit any on dashboard, item-form, items-list)
   └── Fix: Add root pre-build `tsc --build tsconfig.json` + package scripts
         │
         ▼
[Issue 3: custom-fetch.ts AbortSignal]
   ├── Error: TS2322 (AbortSignal | null not assignable to AbortSignal)
   └── Fix: Narrow options.signal with truthiness check before passing to AbortSignal.any()
         │
         ▼
   [CI PASSED: 100% Green]
```

---

### Phase 1: Drizzle ORM Condition Type Mismatch

#### The Error
```text
Error: artifacts/api-server typecheck: src/repositories/items.repository.ts(119,9): error TS2345: 
Argument of type 'SQL<unknown> | undefined' is not assignable to parameter of type 'SQL<unknown>'.
  Type 'undefined' is not assignable to type 'SQL<unknown>'.
```

#### Root Cause
In `artifacts/api-server/src/repositories/items.repository.ts`, `conditions` was initialized as `const conditions = [eq(itemsTable.ownerId, ownerId)]`, typed by TypeScript as `SQL<unknown>[]` (disallowing `undefined`).

When appending search filters:
```ts
if (search) {
  conditions.push(
    or(
      ilike(itemsTable.title, `%${search}%`),
      ilike(itemsTable.category, `%${search}%`),
    )
  );
}
```
In Drizzle ORM, `or(...)` has the signature `(...responses: (SQLWrapper | undefined)[]) => SQL | undefined`. Because its return type statically includes `undefined`, pushing it directly into `SQL<unknown>[]` violated TypeScript's strict null checks.

*(A subsequent manual paste also left an unclosed function call that triggered `TS1135: Argument expression expected`)*.

#### The Fix
We isolated the condition into `searchFilter` and added an explicit truthiness guard:
```ts
const conditions = [eq(itemsTable.ownerId, ownerId)];

if (search) {
  const searchFilter = or(
    ilike(itemsTable.title, `%${search}%`),
    ilike(itemsTable.category, `%${search}%`),
  );
  if (searchFilter) {
    conditions.push(searchFilter);
  }
}
```
**Outcome:** `artifacts/api-server typecheck: Done`.

---

### Phase 2: Monorepo Project Reference Ordering (`TS6305` & `TS7006`)

#### The Error
```text
Error: artifacts/expiry-tracker typecheck: src/pages/dashboard.tsx(1,50): error TS6305: 
Output file '.../lib/api-client-react/dist/index.d.ts' has not been built from source file '.../lib/api-client-react/src/index.ts'.

Error: artifacts/expiry-tracker typecheck: src/pages/dashboard.tsx(24,35): error TS7006: Parameter 'a' implicitly has an 'any' type.
Error: artifacts/expiry-tracker typecheck: src/pages/item-form.tsx(104,19): error TS7006: Parameter 'err' implicitly has an 'any' type.
Error: artifacts/expiry-tracker typecheck: src/pages/items-list.tsx(135,22): error TS7006: Parameter 'item' implicitly has an 'any' type.
```

#### Root Cause
1. **The Architecture:** The monorepo uses TypeScript Project References (`tsconfig.json` solution with `lib/db`, `lib/api-zod`, and `lib/api-client-react`).
2. **Why `api-server` passed:** `artifacts/api-server` had its typecheck script set to `tsc --build tsconfig.json`. The `--build` flag automatically compiled its referenced dependencies (`lib/db` and `lib/api-zod`).
3. **Why `expiry-tracker` failed:** 
   - `artifacts/expiry-tracker` ran `tsc -p tsconfig.json --noEmit` (project mode, which **does not** build references).
   - `lib/api-client-react` had **no build or typecheck script** in its `package.json`.
   - Root `package.json` was running `pnpm -r --if-present run typecheck`, which skipped `lib/api-client-react`.
4. **The Collateral Damage:** Because `lib/api-client-react/dist/index.d.ts` was never generated, TypeScript refused to load the library and fell back to `any`. All query hooks (`useListItems`, `useCreateItem`) returned `any`, triggering `TS7006` on callbacks like `.sort((a, b) => ...)` and `onError: (err) => ...`.

#### The Fix
1. **Root Pre-Build (`package.json`):**
   ```json
   "scripts": {
     "typecheck": "tsc --build tsconfig.json && pnpm -r --if-present run typecheck"
   }
   ```
   Ensures the root solution builds declaration files for all three shared libraries (`lib/db`, `lib/api-zod`, `lib/api-client-react`) before package typechecking begins.
2. **Workspace Package Scripts:**
   Added `"build": "tsc --build tsconfig.json"` and `"typecheck": "tsc --build tsconfig.json"` to:
   - `lib/api-client-react/package.json`
   - `lib/api-zod/package.json`
   - `lib/db/package.json`
3. **Module Cleanup:**
   Removed duplicate re-exports in `lib/api-client-react/src/index.ts`.

---

### Phase 3: Web Standards `AbortSignal` Nullability (`TS2322`)

#### The Error
```text
Error: lib/api-client-react/src/custom-fetch.ts(86,28): error TS2322: 
Type 'AbortSignal | null' is not assignable to type 'AbortSignal'.
  Type 'null' is not assignable to type 'AbortSignal'.
```

#### Root Cause
With `tsc --build` now actively compiling `lib/api-client-react`, TypeScript surfaced a genuine type issue in `custom-fetch.ts`.

Under standard DOM type definitions, `RequestInit.signal` has type:
```ts
signal?: AbortSignal | null | undefined;
```
The original code only checked for `undefined`:
```ts
const signal =
  typeof options.signal === "undefined"
    ? controller.signal
    : AbortSignal.any([options.signal, controller.signal]);
```
If `options.signal` was passed as `null`, the ternary fell into the `AbortSignal.any(...)` branch, passing an array of `(AbortSignal | null)[]`. However, `AbortSignal.any()` strictly expects `Iterable<AbortSignal>`, causing `TS2322`.

#### The Fix
In `lib/api-client-react/src/custom-fetch.ts`, we simplified the guard to a truthiness check:
```ts
const signal = options.signal
  ? AbortSignal.any([options.signal, controller.signal])
  : controller.signal;
```
If `options.signal` is truthy, TypeScript narrows it to `AbortSignal`. If it is `null` or `undefined`, it cleanly falls back to `controller.signal`.

---

## Verification & Key Learnings

1. **Zero-Disk-Space Remote Debugging:**
   Without installing Node or pnpm locally, we used GitHub Actions as our remote compiler/verification runner. By reading line-specific errors from the CI logs and pushing surgical diffs, the entire monorepo was debugged with zero local disk footprint.

2. **TypeScript Project References Gotcha:**
   When monorepo packages reference sibling libraries via `tsconfig.json` `references`, those sibling libraries **must emit declarations (`.d.ts`)** and must be built prior to running `tsc -p --noEmit` on consuming packages. Root-level `tsc --build tsconfig.json` solves this deterministically.

3. **DOM Standards Null Handling:**
   Parameters in browser APIs (like `RequestInit.signal`) often allow `null` in addition to `undefined`. Standard truthiness checks (`if (options.signal)`) safely narrow both away.

