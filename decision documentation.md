# Decision Documentation

A running record of the decisions taken in this repository, why they were taken, and what they affect.

**How to use this file**

- One section per decision. The number never gets reused.
- Each entry states the decision, the reason, and what it changes.
- When a decision is reversed, do not delete the old entry. Add a new one that points back to it.
- Entries marked **Proposed** are not settled yet. Do not build on them.

---

## D-001 — Anonymous demo rooms no longer auto-seed sample data

**Date:** 2026-10-04
**Status:** Accepted — **implemented 2026-10-05 on `feat/empty-room-onboarding`**

### Context

Every brand-new visitor room received 8 sample rows from `generateSampleItems()`. The seed ran inside `requireSession` and was awaited before `next()`, so first paint was never empty.

Two problems came from this.

1. **Neon quota.** Every cold visitor wrote 8 rows and most never returned. This burns free-tier compute, which is the limit that matters, not storage.
2. **Activation cost.** The sample room proved the product in about three seconds. An empty room shows zeroes and requires text before the visitor sees anything work.

### Decision

New rooms start empty. The seed no longer runs automatically. `requireSession` is now synchronous and performs no database work.

The empty room is explained by the UI instead: `components/first-run/first-run-empty.tsx` gives three short steps ending in "add your first item".

### Affects

- `artifacts/api-server/src/middlewares/requireSession.ts`
- `artifacts/api-server/src/seed/`
- `artifacts/expiry-tracker/src/components/first-run/first-run-empty.tsx`
- `artifacts/expiry-tracker/src/pages/dashboard.tsx`
- `artifacts/expiry-tracker/src/pages/items-list.tsx`

---

## D-002 — No feature flag for seeding

**Date:** 2026-10-05
**Status:** Accepted — supersedes the flag idea in the earlier draft of this entry

### Context

The earlier draft of D-002 proposed a `SEED_SAMPLE_DATA` flag, default off, with the plan to turn it on later when the examples button was built.

### Decision

**No flag.** Automatic seeding is removed unconditionally, and the one remaining seeding call site is user-triggered.

### Reason

A flag is a way to forget. If the examples button were ever wired up while the flag stayed off, the button would silently clear the visitor's room and then show nothing — the worst possible outcome for the person who clicked it. One unconditional rule cannot be misconfigured.

There is also nothing to configure: "should a cold visitor cost eight writes?" has only one defensible answer for a free-tier deployment.

### Affects

- No new environment variable
- `config/index.ts` is unchanged

---

## D-003 — Seeding becomes a self-contained module

**Date:** 2026-10-04
**Status:** Accepted — implemented 2026-10-05

### Context

Seeding logic was spread across `lib/seed.ts`, `lib/sample-data.ts`, and inline inside `requireSession`. Date math, the roster, the advisory lock, and the middleware call were mixed together.

### Decision

Move seeding into `artifacts/api-server/src/seed/`, one file per responsibility, with one public entry point.

| File | Responsibility |
|---|---|
| `date-offset.ts` | `dayOffsetISO`, pure and unit tested |
| `sample-items.ts` | the 8-item roster and `generateSampleItems` |
| `index.ts` | the only public surface: `seedRoomIfEmpty`, `clearRoom` |
| `sample-items.test.ts` | the moved test suite |

Nothing outside the folder imports `sample-items` or `date-offset`.

### Reason

This folder is the exact set of things that will **not** port to a self-hosted build. Keeping it isolated makes that boundary visible. See D-008.

---

## D-004 — The delete button bug is a stale bundle, not a logic bug

**Date:** 2026-10-04
**Status:** Accepted — fix still **not shipped**

### Context

The delete button showed "Failed to delete item" while the network tab showed HTTP 204. The item was removed from the database.

I fetched the live bundle at `https://expiryos.netlify.app/assets/index-C2cMtcLG.js` and read its fetch wrapper. It ends with `return await response.json()`, with no guard for 204 or 205. The string `Invalid JSON response body` is absent from the bundle.

On a 204 the body is empty. `response.json()` on an empty body throws `SyntaxError`. TanStack Query catches it, calls `onError`, and the UI reports a failure that did not happen. `onSuccess` never runs, so `invalidateQueries` never runs, and the deleted row stays on screen until a manual reload.

The fix already exists in source. `parseResponse` in `lib/api-client-react/src/custom-fetch.ts` returns early on 204 and 205. Git shows it landed on 2026-08-29 in commit `2bdca69`. The live bundle predates that commit.

**The delete bug and the seeding cost are two separate problems.** A room or cookie mismatch produces 404, not 204. The 204 proves the server found the item and the cookie was valid.

### Decision

No logic change to delete. Ship the existing fix by repairing the deploy pipeline.

### Why it is still not fixed

Two separate causes, neither in the application code:

1. **The web bundle has not been redeployed since August.** Proved by fetching the live asset: identical name, identical byte length, and the 204 guard is absent. GitHub Actions reports the deploy step as successful, but the live bundle does not change.
2. **GitHub could not supply a runner.** On 2026-10-05 the `deploy-netlify` job ran **zero steps** and failed with "the job was not acquired by Runner of type hosted". That is GitHub-side capacity, not this repository.

### Affects

- `.github/workflows/ci.yml`
- `DELETE_BUTTON_INVESTIGATION.md`

---

## D-005 — CI must prove the deploy reached the live site

**Date:** 2026-10-04
**Status:** Accepted — implemented 2026-10-05, **not yet proven green**

### Context

`nwtgck/actions-netlify@v3` exits with code 0 when `NETLIFY_AUTH_TOKEN` or `NETLIFY_SITE_ID` is missing, because `fails-without-credentials` defaults to `false`. The job shows a green check and ships nothing. This is how a months-old bundle stayed live while the pipeline looked healthy.

The obvious fix is not enough. Even with credentials present, a deploy can land on the **wrong Netlify site** and still report success.

### Decision

Three guards, in order:

1. `fails-without-credentials: true` on the deploy step.
2. A build-time tripwire that fails if the output references the known-stale
   bundle hash `index-C2cMtcLG.js`.
3. A post-deploy step named **Confirm the live site runs the new build**, which
   reads the bundle filename out of both the build output and the live site and
   compares them. A mismatch fails the job and prints both names.

Guard 3 is the one that matters. A plain "is the site up?" check is useless
here, because the stale bundle also answers yes.

### Also

Both jobs are pinned to `ubuntu-24.04` instead of `ubuntu-latest`, because
`ubuntu-latest` moves to Ubuntu 26 on 2026-10-19 and because a specific version
usually has free runner capacity sooner than the moving label.

---

## D-006 — One concern per change, always

**Date:** 2026-10-04
**Status:** Accepted

### Context

The delete bug survived review and survived a merge into an August bundle. Large mixed commits are hard to review, hard to revert, and hard to bisect.

### Decision

Every change ships as its own small pull request with a single purpose. No bundled refactors. No drive-by formatting. If two things must change together, that is a signal the split is wrong, not the rule.

Each PR states its own verification steps and can be reverted alone.

**Applied twice already.** An early attempt put the `.gitattributes` change and the CI change in one commit, which broke this rule; they were split. A second attempt dropped the line-ending fix for three `attached_assets` text files; it was caught by counting bytes and restored.

---

## D-007 — Normalize line endings before any other work

**Date:** 2026-10-04
**Status:** **Done** — commit `12805e4`

### Context

`core.autocrlf=true` was set in this clone. The working tree reported ~198 modified files while `git diff --stat` reported zero changed lines. The noise was pure CRLF conversion.

### Decision

Add `.gitattributes` with `* text=auto eol=lf`, set `core.autocrlf false` in the clone, then run `git add --renormalize .` in a commit that contains nothing else.

### Reason

Until this landed, every pull request was unreviewable and real changes hid inside the noise.

### Verification

`git diff HEAD~1 --stat --ignore-cr-at-eol` returns only `.gitattributes`, proving the commit contains one new file and zero content drift. Three `attached_assets` text files did change, because they were stored with CRLF in the index and are now LF, which is the point.

---

## D-010 — Release on a branch, merge once

**Date:** 2026-10-05
**Status:** Accepted

### Context

The owner asked for no deploy until auto-seeding was removed, the empty table was in place, and the short tutorial existed. That is a single, atomic release.

### Decision

All work happens on `feat/empty-room-onboarding`. The owner merges it into `main` when satisfied. One merge means one API deploy and one web deploy together.

### Reason

**The API and the web deploy independently.** The API auto-deploys from `main` through Render's git integration — proved by sending a bare unsigned room cookie to production and watching it be rejected with a signed one, which is post-2026-09-23 code. The web bundle deploys from GitHub Actions.

Consequence: pushing a server change to `main` cannot be held back. There is no switch for it. A branch is the only way to prepare several changes and release them together.

Pushing to a branch runs `typecheck-and-test` only, because the deploy job is gated on `github.ref == 'refs/heads/main'`.

---

## D-008 — Self-hosting comes later, and it is a good fit

**Date:** 2026-10-04
**Status:** Accepted as direction, not yet designed

### Context

The product tracks certificates, insurance, licenses, and identity documents. Visitors expect that data to stay on their own machine. A hosted demo is a good funnel, but a self-hosted install is the better final answer.

### Decision

Do not build it now. When the time comes, decide early whether it is the same codebase behind a flag or a thin wrapper.

Things that port: the schema, `lib/status.ts`, the status thresholds in config, and the UI.

Things that do not port: the anonymous room, the signed session cookie, and every argument about Neon quota. That is why D-003 isolates the seed module.

---

## D-009 — The tutorial is three steps, not a manual

**Date:** 2026-10-04
**Status:** Accepted — implemented 2026-10-05

### Context

Removing seeding (D-001) makes the first screen a set of zeroes. Something must close that gap.

### Decision

The first-run screen gives three short steps and one button that ends in the visitor's own first item. The examples button sits quietly below it as the other choice.

### Reason

A visitor who arrived from the landing page wants to see the product work, not read documentation. A long guide asked for up front loses the people who have not decided yet.

---

## D-011 — The examples button only appears on an empty room

**Date:** 2026-10-05
**Status:** Accepted

### Context

`POST /api/session/reset` clears the caller's room and writes the example roster into a new one. That is destructive by design.

### Decision

The button renders only when the server confirms the room holds zero items. Emptiness is read from the room-wide `total` in the summary response, not from the current filtered list, so a search term or status tab can never make a populated room look empty. If the summary request fails, `summary` is `undefined` and the room is reported as **not** empty, so an error never replaces real content with an onboarding prompt.

### Reason

Without this rule a visitor who adds three real items could lose all three by clicking one button. The rule is enforced in `hooks/use-room-is-empty.ts`, which both pages share so they cannot disagree.

---

## D-012 — Room cleanup is a separate, later job

**Date:** 2026-10-05
**Status:** Accepted as direction, not yet built

### Context

Nothing ever deletes a room. Rows written before D-001 stay in the database until a person deletes them.

### Decision

Do not build cleanup now. After the tutorial, add a scheduled job (Render cron) that deletes rooms untouched for a long time.

### Reason

Two different costs are being confused. **Writing** rows consumes compute, which is the limit that matters on a free tier, and D-001 stops that. **Storing** old rows is far cheaper. Cleaning up is worthwhile but not urgent, and it is the riskiest change to get wrong, because a bug there deletes real visitors' data rather than demo noise.

---

## D-013 — Tutorial not showing: two-cause root analysis

**Date:** 2026-10-07
**Status:** Accepted — CI fix implemented, deploy unblocked by manual Netlify publish

### Context

The `FirstRunEmpty` tutorial component was reported as invisible. Investigation found two separate causes, each sufficient to hide it on its own.

### Cause 1: Wrong bundle on the live site (blocking)

The live site `expiryos.netlify.app` continued to serve `index-C2cMtcLG.js` (August 2026). The new bundle `index-DRfr193c.js` — which contains `FirstRunEmpty` — was uploaded by GitHub Actions to Netlify but was never promoted to production because **Netlify "Auto publishing" is disabled**.

This is intentional (owner is on the free tier and wants to keep Netlify build minutes at zero). The workflow is: GitHub Actions builds and uploads → owner manually clicks "Publish deploy" in the Netlify dashboard → live site updates. This step was missed after the last CI run.

### Cause 2: Existing seeded rooms (masking, non-blocking for new visitors)

`useRoomIsEmpty` reads `summary.total` from `GET /api/items/summary`. For visitors who first arrived before D-001 was deployed, their stored room already contains 8 rows. `summary.total` is 8, not 0, so `isRoomEmpty` is `false` and `FirstRunEmpty` never renders, even after the new bundle ships.

This is not a bug. Those returning visitors have already seen the product. New visitors get an empty room and see the tutorial. Cleaning up pre-D-001 rooms is the job of the scheduled cleanup (D-012, not yet built).

### CI fix applied

`nwtgck/actions-netlify@v3` was configured with `enable-commit-comment: true` and a `github-token`. The Actions `GITHUB_TOKEN` only has `contents: read` and `metadata: read`, so the action threw three 403 errors when it tried to write commit comments, deployment records, and commit statuses. These are cosmetic features and do not affect whether the deploy reaches Netlify. They are now set to `false` and `github-token` is removed.

A 10-second `sleep` was added before the bundle-comparison check so the Netlify edge CDN has time to flush before `curl` reads `index.html`.

The "Confirm the live site" step will still fail if auto-publishing is off, because Netlify accepts the upload but does not swap the live domain. That step now carries a comment explaining this and directing to this decision.

### Affects

- `.github/workflows/ci.yml`
- `decision documentation.md` (this entry)

---

## Rejected and superseded

- **`SEED_SAMPLE_DATA` feature flag.** Superseded by D-002. Rejected because a flag is a way to forget, and the failure mode is silent data loss for the person who clicks the button.
- **A local test runner in `lib/api-client-react`.** Rejected for now. Adding a dependency changes `package.json` without the matching lockfile entry, which breaks CI's `pnpm install`. The regression protection is the bundle-comparison guard in D-005 instead.
- **Shipping the seeding removal alone.** Rejected in favour of D-010, because a push to `main` cannot be held back and would have shipped empty rooms with no guidance.