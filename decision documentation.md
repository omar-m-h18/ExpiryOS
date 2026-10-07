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

## D-014 — Demo room capped at 10 items, sample roster reduced to 4 items

**Date:** 2026-10-08
**Status:** Accepted — implemented on `feat/empty-room-onboarding`

### Context

1. `MAX_ITEMS_PER_OWNER` previously defaulted to 100 in `config/index.ts`. On a free Neon database, anonymous ephemeral rooms holding up to 100 items risk unnecessary table bloat. A 10-item limit provides more than enough room for prospective users to evaluate the tool.
2. The sample roster generated 8 items. If the cap is 10 items, clicking "Show me examples" would immediately consume 80% of the room's quota, leaving the visitor room to add only 2 custom items before being blocked.

### Decision

1. **Backend cap**: Set `MAX_ITEMS_PER_OWNER` default from 100 to 10.
2. **Sample roster**: Trim `SAMPLE_SPECS` to 4 items (Netflix active, SSL certificate expiring soon, Car Insurance expiring this week, Passport expired). All dashboard status cards and spotlight categories remain covered, while leaving 6 slots open for user experimentation.
3. **Proactive UI feedback**:
   - `components/demo-banner.tsx` displays the current count and cap (`X / 10 items`) on every demo page.
   - When the 10-item cap is reached, `demo-banner` switches to a destructive alert style informing the visitor.
   - `pages/item-form.tsx` disables the submit button and displays a warning banner when creating a new item at limit.

### Affects

- `artifacts/api-server/src/config/index.ts`
- `artifacts/api-server/src/seed/sample-items.ts`
- `artifacts/expiry-tracker/src/components/demo-banner.tsx`
- `artifacts/expiry-tracker/src/components/first-run/first-run-empty.tsx`
- `artifacts/expiry-tracker/src/pages/item-form.tsx`
- `decision documentation.md` (this entry)

---

## D-015 — Customer email collection delegated to Tally.so popup modal

**Date:** 2026-10-08
**Status:** Accepted — implemented on `feat/empty-room-onboarding`

### Context

The demo application previously contained an inline form posting email strings to `POST /api/leads`. This added unnecessary maintenance overhead (Neon DB storage, rate limiting, and zero anti-spam or qualification questions).

### Decision

Delegate customer lead collection to Tally.so (`https://tally.so/r/lbPjoV`, form ID `lbPjoV`):

1. **Popup widget:** Include Tally's `embed.js` script in `index.html`.
2. **Helper with fallback:** `src/lib/tally.ts` triggers `window.Tally.openPopup("lbPjoV", ...)` with modal width 540 and wave emoji, falling back to a direct tab redirect if the widget is blocked.
3. **Placements:**
   - Landing page: Replaces the custom email form with a clean "Join Early Access List" card.
   - App sidebar: Provides a subtle "Early Access List" trigger so users exploring the demo can sign up without returning to the landing page.
4. **Backend cleanup:** Completely remove `POST /api/leads`, `leads.repository.ts`, `RATE_LIMIT_MAX_LEADS`, and `demo.ts` helper so zero waitlist requests ever write to the Neon database.

### Affects

- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/leads.ts` (deleted)
- `artifacts/api-server/src/repositories/leads.repository.ts` (deleted)
- `artifacts/api-server/src/config/index.ts`
- `artifacts/expiry-tracker/src/lib/demo.ts` (deleted)
- `artifacts/expiry-tracker/index.html`
- `artifacts/expiry-tracker/src/lib/tally.ts`
- `artifacts/expiry-tracker/src/pages/landing.tsx`
- `artifacts/expiry-tracker/src/components/layout.tsx`
- `decision documentation.md` (this entry)

---

## D-016 — Production review hardening: DST-safe date math, deterministic sorting, and form race mitigation

**Date:** 2026-10-08
**Status:** Accepted — implemented on `feat/empty-room-onboarding` and `main`

### Context

A staff engineer production code review identified three reliability concerns:
1. `computeStatus` used `Math.floor(diffMs / 86400000)` on local midnight Date instances. During Daylight Saving Time transitions (23-hour or 25-hour days), this caused off-by-one status shifts.
2. `itemsRepository.findAll` sorted solely by `expiration_date`. When multiple items share the same expiration date, Postgres returns them in non-deterministic disk order.
3. `item-form.tsx` evaluated `isAtLimit` against `summary?.total ?? 0`. During initial load of `/demo/items/new`, the submit button rendered enabled for ~200ms before snapping to disabled when the summary response resolved.

### Decision

1. **DST & timezone immunity:** Use pure UTC calendar timestamps (`Date.UTC`) with `Math.round` in `computeStatus` so local server timezone and DST boundaries have zero effect on day count calculations.
2. **Deterministic ordering:** Add `asc(itemsTable.id)` as a secondary tie-breaker in `orderBy`.
3. **Form state stability:** Guard `isSubmitDisabled` with `(isNew && isLoadingSummary)` so the form never flashes an enabled submit state before room capacity is verified.

### Affects

- `artifacts/api-server/src/lib/status.ts`
- `artifacts/api-server/src/repositories/items.repository.ts`
- `artifacts/expiry-tracker/src/pages/item-form.tsx`
- `decision documentation.md` (this entry)

---

## D-017 — Interactive & skippable onboarding walkthrough

**Date:** 2026-10-08
**Status:** Accepted — implemented on `feat/empty-room-onboarding` and `main`

### Context

When automatic room seeding was removed (D-001), cold visitors arrived at an empty screen. The initial `FirstRunEmpty` component presented static explanatory text and a single CTA. User feedback showed that static onboarding text lacked engagement and did not clearly convey the product's dynamic status calculation behavior.

### Decision

1. **3-Step Interactive Walkthrough:** Transform `FirstRunEmpty` into an interactive stepper:
   - **Step 1:** Clickable item presets (*Passport*, *Car Insurance*, *Domain Name*, *Streaming*) that update a simulated live item card preview.
   - **Step 2:** Interactive status explorer (*Active*, *Expiring Soon*, *Expired*) explaining continuous, non-stale background calculations.
   - **Step 3:** Actionable choice between loading 4 sample items and creating a custom item.
2. **Skippable & Recoverable:** Add a clear "Skip tutorial" action that collapses the tour into a clean empty room state. Persist the dismissal in `sessionStorage` (`expiryos_tutorial_skipped`) while providing an instant "Show interactive tour" reactivation link.

### Affects

- `artifacts/expiry-tracker/src/components/first-run/first-run-empty.tsx`
- `artifacts/expiry-tracker/src/pages/dashboard.tsx`
- `artifacts/expiry-tracker/src/pages/items-list.tsx`
- `decision documentation.md` (this entry)

---

## D-018 — Multi-touchpoint early access elevation, calendar layout stabilization, and category chips

**Date:** 2026-10-08
**Status:** Accepted — implemented on `feat/empty-room-onboarding` and `main`

### Context

User feedback highlighted four UX/UI pain points:
1. The early access list link was muted, hard to locate, and buried in the desktop sidebar footer.
2. The desktop sidebar bottom displayed a duplicate "Add Item" button that created visual clutter with the primary "Add Item" button in `/demo/items`.
3. The calendar date-picker popover in `item-form.tsx` experienced table width collapse, squishing weekday headers (`SuMoTuWeThFrSa`) and date cells into an illegible column.
4. Item creation required manual typing for common renewal categories (*Documents*, *Subscriptions*, etc.).

### Decision

1. **Elevate Early Access across 5 touchpoints:**
   - Top demo banner: add a `✨ Get Early Access` pill button visible on every screen.
   - Desktop sidebar footer: elevate the muted link into a high-visibility callout card.
   - Mobile tab bar: add a 1-tap Waitlist action item.
   - Landing page: position `Join Waitlist` as a primary hero action alongside `Start the demo`.
   - Items list: add a gentle, dismissible milestone banner highlighting upcoming alert delivery.
2. **Calendar Popover Width & Cell Enforcement:** Enforce `w-[280px]` root width on `Calendar`, dedicated `w-9` weekday header cells, and `h-9 w-9` day buttons with explicit selection/hover states in `calendar.tsx`.
3. **Category Suggestion Chips:** Provide quick-pick pills (*Documents*, *Subscriptions*, *Insurance*, *Software*, *Warranties*, *Health*) beneath the category input in `item-form.tsx`.
4. **Desktop Navigation Unification:** Move "Add Item" into the primary sidebar navigation alongside Dashboard and All Items, eliminating the redundant bottom button.

### Affects

- `artifacts/expiry-tracker/src/components/demo-banner.tsx`
- `artifacts/expiry-tracker/src/components/layout.tsx`
- `artifacts/expiry-tracker/src/components/ui/calendar.tsx`
- `artifacts/expiry-tracker/src/pages/item-form.tsx`
- `artifacts/expiry-tracker/src/pages/items-list.tsx`
- `artifacts/expiry-tracker/src/pages/landing.tsx`
- `decision documentation.md` (this entry)

---

## Rejected and superseded

- **`SEED_SAMPLE_DATA` feature flag.** Superseded by D-002. Rejected because a flag is a way to forget, and the failure mode is silent data loss for the person who clicks the button.
- **A local test runner in `lib/api-client-react`.** Rejected for now. Adding a dependency changes `package.json` without the matching lockfile entry, which breaks CI's `pnpm install`. The regression protection is the bundle-comparison guard in D-005 instead.
- **Shipping the seeding removal alone.** Rejected in favour of D-010, because a push to `main` cannot be held back and would have shipped empty rooms with no guidance.