# Roadmap

Forward-looking work for the project: UI/UX for the SPA
(`artifacts/expiry-tracker`), plus product and naming items in steps 7–9.

This roadmap came out of an audit against three conversion/quality patterns
(squircle geometry, scroll-driven motion, one-idea-at-a-time content). Items are
ordered so that each step unblocks the next — in particular, **step 5 depends on
step 4**, because the landing page currently fits inside a single viewport and
therefore never scrolls.

Legend: ✅ done · ⬜ planned · ⛔ deliberately rejected (see bottom)

> **Note:** PR #11 (`feat/overview-redesign`) landed during this audit and
> rewrote `pages/dashboard.tsx` plus `components/spotlight-action.tsx`. Steps 1
> and 6 below are annotated accordingly — re-read the current dashboard before
> acting on any dashboard item.

> **Steps 7–9** come from a later product review rather than the original
> conversion audit: an interactive first-run tour, a native RTL Arabic version,
> and a project rename. They are independent of steps 1–6 and of each other.

---

## ✅ Step 1 — Fix the build blocker (resolved upstream)

`src/pages/dashboard.tsx` rendered `<Button>` in three places (summary-error
retry, needs-attention retry, spotlight retry) without importing it, so the file
could not compile.

**Status:** resolved by the Overview redesign (PR #11, `feat/overview-redesign`),
which rewrote `dashboard.tsx` and imports `Button` at the top. No action needed
here — the audit finding was fixed incidentally by that work.

---

## ✅ Step 2 — Radius scale + squircle geometry

The radius tokens were all derived from one base (`calc(var(--radius) ± 4px)`),
yielding a 4–12px spread in which every surface had the same softness. Tokens are
now explicit tiers (`sm` 6px → `xl` 20px → `2xl` 24px) and `corner-shape: squircle`
is applied progressively to the `rounded-md/lg/xl/2xl` utilities, with
`corner-shape: inherit` on the `hover-elevate` overlays.

**Status:** complete. See `CHANGELOG.md`.

**Known limitation:** squircle corners only render in Chromium 139+. Safari and
Firefox show the plain rounded fallback, which is why the numeric radius tiers
must look correct on their own — do not introduce a design that *depends* on
superellipse geometry.

---

## ✅ Step 3 — Reduced-motion guard

A `prefers-reduced-motion: reduce` block collapses entrance animations and
colour transitions, with `.animate-spin` exempted so the save spinner keeps
turning.

**Status:** complete.

---

## ⬜ Step 4 — Landing page: one idea at a time

**Priority:** high · **Effort:** large · **File:** `src/pages/landing.tsx` (only)

### Problem

The landing page is a single `max-w-2xl` centered column inside
`min-h-[100dvh]` that stacks **seven distinct ideas** in one glance: brand
lockup, H1, subhead, demo-notice card, "Start the demo" CTA, "Join Waitlist"
CTA, a second "Interested in self-hosting?" block with a **third** waitlist CTA,
and a footer. Three competing asks for the same action is the core conversion
defect. The demo-notice card also duplicates copy that `DemoBanner` already
shows inside the app.

### Plan

Restructure into five full-bleed bands, following Problem → Solution → Proof → CTA:

1. **Hero** — H1 + one sentence + exactly one CTA ("Start the demo").
2. **"One date. That's the input."** — the add-item form as the visual, ≤2 lines of copy.
3. **"It tells you what's urgent."** — the three real status states side by side,
   rendered with the actual `StatusBadge` component.
4. **"Private by default."** — no signup, sandbox room, HMAC-scoped session.
   Absorbs the current demo-notice copy.
5. **Early access** — the single remaining waitlist ask, plus footer.

Each band: full-bleed background, inner `max-w-6xl`, one heading, ≤30 words of
copy, one visual, `min-h-[70vh]` on desktop.

### Acceptance criteria

- Exactly one primary CTA and one waitlist CTA on the page (down from three).
- No band contains more than one idea; no band exceeds ~30 words of body copy.
- All visuals reuse existing components (`Card`, `StatusBadge`, `Input`) rather
  than new imagery — there are no product screenshots in this project.
- The Tally modal still opens from the remaining waitlist trigger.

### Note

This is the only step that changes the first impression of the product. Give it
its own review rather than bundling it with steps 5–6.

---

## ⬜ Step 5 — Scroll-driven motion on the landing page

**Priority:** medium · **Depends on:** step 4 · **Effort:** medium

### Problem

All motion in the app today is one-shot on mount (`animate-in fade-in
slide-in-from-bottom-4`). Nothing responds to scroll, because nothing scrolls.
`framer-motion` is listed in `package.json` but is **never imported** — do not
assume it is wired up.

### Plan

- Add a small `useReveal` hook (~20 lines, `IntersectionObserver`) in
  `src/hooks/`, toggling a class when a band enters the viewport. Reuse the
  existing `tw-animate-css` utilities (`animate-in fade-in slide-in-from-bottom-*`)
  rather than adding animation calls.
- Build a CSS-only "status card stack" from the real `Card` + `StatusBadge`
  components and give it a subtle scroll-linked `rotateX` / `translateY`
  parallax. This is the "simulate holding the product" beat — it stays honest
  because it is actual product UI, not a stock mockup.
- Timing: 200–300 ms, ease-out. Reveal once per session, never re-trigger on
  scroll-up.

### Acceptance criteria

- Motion is gated behind the existing `prefers-reduced-motion` guard — with
  reduce-motion enabled, bands are simply visible with no transform.
- No new runtime dependency; `framer-motion` stays unused (or is removed from
  `package.json` as dead weight).
- No layout shift: bands reserve their space before revealing.

---

## ⬜ Step 6 — Dashboard density (largely resolved upstream)

**Priority:** low · **Effort:** small · **File:** `src/pages/dashboard.tsx`

### Problem (as originally audited)

Four summary cards (`Total Items`, `Active`, `Expiring Soon`, `Expired`) carried
identical visual weight, giving a number that implies no urgency the same
prominence as "Expired". The four-across grid was also the densest block in the
product.

### What the Overview redesign already fixed

PR #11 shipped most of this step:

- Each status tile now carries a share meter (`role="meter"`) and a `% of items`
  caption, so the tiles are no longer four bare numbers.
- Tiles enter with a staggered `enterDelay()` sequence, gated behind
  `motion-safe:` — the stagger this step called for already exists.
- "Needs Attention" is now "Needs attention" with an icon-state component and
  proper `aria-labelledby`.

### What remains (optional)

Only one question is left: whether `Total items` should keep equal grid weight
now that it carries a status-mix bar. If revisited, demote it to a quieter
header row; the three status tiles are the actual triage decision.

### Acceptance criteria

- Three status tiles remain clickable and preserve their filter hrefs.
- Total count stays visible without scrolling.
- Any new motion stays gated behind `prefers-reduced-motion` (the global guard in
  `index.css` already covers transitions, which `motion-safe:` alone does not).

### Explicit non-goal

Do **not** add `rotateY` / `scale` scroll transforms to dashboard cards or table
rows. Scroll-driven product-tilt is a marketing-surface pattern; in a data tool
it degrades scanability of dates and statuses.

---

## ⬜ Step 7 — First-run tour commits the first item

**Priority:** high · **Effort:** half a day · **File:** `src/components/first-run/first-run-empty.tsx`

### Problem

The 3-step tour teaches and then discards. The user picks a preset (Passport,
Car Insurance, Netflix, example.com) and a timeline (1 year / 2 weeks / 5 days
ago), sees a realistic preview card with a real `StatusBadge` — and step 3 hands
them a link to `/demo/items/new`, an empty form. Every choice is thrown away, and
the payoff the tour just promised is replaced by a blank page.

### What already exists

Everything needed is already in component state: `selectedPreset` holds `name` +
`category`, `selectedTimeline` holds `daysOffset`, and `simulatedDateString` is
computed. `useCreateItem` exists and is used in `item-form.tsx`. `FirstRunEmpty`
only renders when `useRoomIsEmpty()` is true, so the room is guaranteed empty —
no duplicate-item risk.

### Plan

Turn step 3 into a **commit step** instead of a redirect:

1. **Local-safe date helper.** `simulatedDateString` is a display string
   (`toLocaleDateString`), not an API value. The API needs `YYYY-MM-DD`, computed
   from local parts. **Do not use `toISOString()`** — it shifts the date by the
   timezone offset (the trap already documented in `lib/utils.ts`).
2. **Wire the mutation.** `useCreateItem` + `useQueryClient` + `useNavigate`.
   Payload: `title = preset.name`, `category = preset.category`,
   `expiration_date = offset(timeline.daysOffset)`.
3. **Summary card before the button.** "We will create **Passport** ·
   Documents · expires 12 Mar 2027 · *Expiring soon*". The user sees exactly what
   will be written, so auto-creation is never a surprise.
4. **Pending + error states.** Disable while `isPending` (prevents double-create);
   catch 409 with a toast.
5. **Land on `/demo/items`**, not the dashboard — the payoff is seeing their own
   row with the status badge the tour just promised.
6. **Keep both escape hatches:** "I'll do it myself" → the existing form, and
   "Skip tour" unchanged.

### The real gotcha

Step 2 *promises* a status and the server *computes* it independently. With
defaults these agree (14 days ≤ `EXPIRING_SOON_DAYS` 30 → expiring soon; 365 →
active; −5 → expired). But if `EXPIRING_SOON_DAYS` is lowered to 10, the tour
would promise "Expiring soon" and create an "Active" item — the tutorial would be
lying. Either derive the timeline offsets from `config/index.ts`, or accept the
coupling and document it in a comment.

### Acceptance criteria

- Step 3 creates exactly one item and navigates to `/demo/items`.
- The created item's status matches the badge shown in step 2 under default config.
- Double-clicking the commit button cannot create two items.
- The date written to the API is the local calendar date, verified in a
  non-UTC timezone (e.g. `TZ=Pacific/Kiritimati`).
- "I'll do it myself" and "Skip tour" still work.

### Test matrix

4 presets × 3 timelines = 12 paths, plus the double-click and 409 paths.

### Optional upgrade

Let the user edit the title inline at step 3, so the entry is *theirs* rather
than a preset name.

---

## ⬜ Step 8 — Native RTL Arabic version

**Priority:** medium · **Effort:** ~1 week + a native Arabic writer · **Depends on:** nothing

> **Scope note:** ASD-STE100 is a controlled **English** standard. It does not
> apply to Arabic text. A separate Arabic style guide is required. Do not
> translate the STE100 rules into Arabic.

### Current state

No localization layer exists. `<html lang="en">` has no `dir` attribute. All text
is hardcoded English. DM Sans and Outfit have no Arabic glyphs.

Direction work is small: **32 direction-dependent utilities across 15 application
files** — `ml-` 3, `mr-` 9, `pl-` 4, `left-` 3, `right-` 3, `text-left/right` 4,
`translate-x` 6. One logical utility already exists.

### Plan

**1. Direction layer**

- Set `lang` and `dir` on `<html>`.
- Set `dir="rtl"` **before first paint** via a small inline script in
  `index.html`. Setting it in React flashes left-to-right first.
- Replace physical utilities with logical ones: `ml-` → `ms-`, `pl-` → `ps-`,
  `left-` → `start-`, `text-left` → `text-start`, `translate-x` → `rtl:` variants.
- The sidebar uses `flex-row` and moves to the right automatically — no special
  code.
- Mirror directional icons: `ArrowRight`, `ArrowLeft`, `ChevronRight`,
  `ArrowUpRight`.

**2. Arabic font**

- Add IBM Plex Sans Arabic or Noto Sans Arabic. **Self-host it** — a font CDN
  reintroduces the GDPR problem fixed in the compliance work above.
- **Never apply `letter-spacing` / `tracking-tight` to Arabic.** Arabic letters
  connect; extra spacing breaks the joins.
- Raise line-height to ~1.7 and the base font size by ~1px.

**3. String layer**

~40 user-facing strings: 28 visible, 4 placeholders, 5 `aria-label`, 6 toast
titles.

| Option | Cost | Verdict |
|---|---|---|
| Typed dictionary + `useLocale()` hook | No new dependency | **Recommended** — the string count is small, and `Intl.PluralRules` gives Arabic plurals for free |
| `react-i18next` | New dependency + lockfile change | Only if more than two languages are planned |

The dictionary matches project style and the same reasoning that led to
vendoring fonts rather than adding `@fontsource`.

**4. Dates, numbers, plurals**

- `lib/utils.ts` and `dashboard.tsx:420` use `toLocaleDateString(undefined, …)`.
  Pass the active locale so UI and date language always match.
- `item-form.tsx` uses `date-fns` `format(date, "MMM d, yyyy")` — hardcoded
  English. Import the `ar` locale.
- `StatusBadge` uses English plural logic (`days === 1 ? "day" : "days"`).
  **Arabic has six plural categories** — use `Intl.PluralRules("ar")`, not a
  second English-style rule.
- Pick one digit set (Western `0123` or Arabic-Indic `٠١٢٣`) and use it everywhere.
- Isolate Latin text inside Arabic (`example.com`) with `<bdi>` or a `dir="ltr"`
  span so it cannot reorder.

**5. Server messages**

The API returns English strings that surface in toasts:

- `"expiration_date must be a real date in YYYY-MM-DD format"`
- `"Too many items created. Please slow down."`
- `"This demo room is limited to N items…"`

Return stable error codes, or map messages client-side. English text must not
appear in an Arabic interface.

**6. Content**

- Use a native Arabic writer. **Do not machine-translate** — that is the
  difference between "made by Arabs" and "made for Arabs".
- Replace generic presets with locally familiar documents: *Iqama* (residency
  permit), *Istimara* (vehicle registration), passport, medical insurance.
- Decide whether Hijri (*هـ*) dates appear beside Gregorian (*م*).
- The Tally waitlist form is English only — either accept the gap or replace it.

### Acceptance criteria

- RTL visual check passes on all 5 routes, light and dark.
- Plural forms correct for 0, 1, 2, 3–10, 11–99, 100 days.
- Dates correct in the calendar popover and in list rows.
- Latin text (`example.com`) does not reorder inside Arabic sentences.
- Reloading with a saved locale shows **no** left-to-right flash.
- No English string is reachable from an Arabic UI, including error toasts.

### Notes

- `react-day-picker` already has `rtl:` variants for its arrows in
  `ui/calendar.tsx` — verify rather than reimplement.
- The Arabic writer is the long pole. Start that work first; the code is the
  shorter half.

---

## ⬜ Step 9 — Rename the project

**Priority:** low (do it before launch, not after) · **Effort:** 1 day · **Blocks:** nothing

### Problem

`ExpiryOS` reads as a feature flag, not a brand, and the namespace is partly
taken: `expiryos.com` is registered (`expiryos.io` is free).

### Research already done

A two-round naming exercise (100 candidates, 2 shortlists) was run, then screened
against live registries. Method notes, because they matter if this is redone:

- Domain status came from RDAP, **with controls** (`google.com` → 200, random
  string → 404). Two endpoints were **discarded as broken**: `rdap.org` for
  `.io` reported `github.io` as free, and `rdap.org` for `.co` reported
  `google.co` as free.
- Reliable sources: Verisign RDAP (`.com`), Identity Digital RDAP (`.io`),
  `rdap.org` (`.app`, `.dev`).
- **Finding: of 106 `.com` candidates, only 11 were free.** Every plain-English
  name in this category is already registered — `useby.com`, `bestbefore.com`,
  `stillgood.com`, `goodtill.com`, `daysleft.com`, `shelflife.com`. `.com` is not
  a realistic target for this vocabulary; a coined name on `.app`/`.io` is.

### Finalists (domain status verified)

| Name | `.com` | `.io` | `.app` | `.dev` |
|---|---|---|---|---|
| **Expirary** | FREE | FREE | FREE | FREE |
| **Duenary** | FREE | FREE | FREE | FREE |
| **Expirique** | FREE | FREE | FREE | FREE |
| **ExpiryMark** | FREE | FREE | FREE | FREE |
| **SoonTrack** | FREE | FREE | FREE | FREE |
| **Lapsary** | FREE | FREE | FREE | FREE |
| **Lapsely** | taken | FREE | FREE | FREE |

All seven are free on npm and as GitHub usernames, and none has a live company or
product footprint.

### Recommendation

**`Expirary` — `expirary.com`.** The only finalist free on all four TLDs with no
trademark collision surfaced. Owns the category, transliterates cleanly to Arabic
(إكسبيراري), and the existing `E` mark still works.

Runner-up **`Lapsely`** (`lapsely.io`) is more brandable but loses the `.com` and
carries "lapse" — a word meaning *failure* — in a product whose promise is that
you won't forget.

### ⚠️ This is a preliminary screen, not a clearance opinion

- USPTO TESS/API returned 404 (endpoint retired), TMview refused connections
  (WAF), and Justia's USPTO mirror sat behind a Cloudflare challenge. No exact
  mark surfaced through the accessible index, but **the primary registers were
  not queried directly.**
- Before filing or printing: run a formal search in **Nice classes 9 (software)
  and 42 (SaaS)** across USPTO, EUIPO, and UKIPO (~$200–500).
- Descriptiveness cuts both ways: `Expirary`, `ExpiryMark`, `UseBy` are close to
  the generic term — low infringement risk, but **weak protection**. `Lapsely`,
  `Duenary`, `Expirique` are arbitrary marks and much stronger to enforce.
- RDAP 404 can include pending-delete domains. Confirm at a registrar before
  committing.

### Rename surface (measured)

| Location | Occurrences |
|---|---|
| `first-run/first-run-empty.tsx` | 8 |
| `README.md` | 6 |
| `artifacts/expiry-tracker/index.html` | 6 |
| `README.STE100.md` | 5 |
| `KNOWLEDGE.md` | 4 |
| `landing.tsx` | 3 |
| `api-server/src/config/index.ts` | 2 |
| `DELETE_BUTTON_INVESTIGATION.md` | 2 |
| `layout.tsx`, `items-list.tsx`, `lib/tally.ts`, `netlify.toml`, `AGENTS.md`, `CONTRIBUTING.md`, `technical-implementation-plan.md`, `.replit-artifact/artifact.toml`, `.agents/memory/config.md` | 1 each |
| `lib/api-spec/openapi.yaml` (`info.description`) | 1 → regenerates ~19 generated files |

**Identifiers that are not just display strings:**

- `SESSION_COOKIE = "expiryos_demo"` (`api-server/src/lib/session.ts:28`) —
  renaming it invalidates every existing anonymous room. Acceptable pre-launch;
  **not** acceptable after launch without a migration.
- `sessionStorage` key `expiryos_hide_early_access_callout`
  (`items-list.tsx:60,66`).
- `DEV_FALLBACK_SECRET` contains `expiryos-…` (`session.ts:37`) — dev only.
- Error message example URL `https://expiryos.netlify.app` (`app.ts:35`).
- Package names: `@workspace/expiry-os` and root `expiry-os`.

Generated files under `lib/api-zod` and `lib/api-client-react` are Orval output —
**never hand-edit**; change `openapi.yaml` and re-run codegen.

### Acceptance criteria

- `grep -ri expiryos` returns only `CHANGELOG.md` history and intentional
  migration notes.
- `pnpm run typecheck` passes after codegen.
- No cookie-name change ships after launch without a session migration.

---

## ⛔ Deliberately rejected

Recorded so these are not re-litigated later.

| Idea | Why not |
|---|---|
| `border-radius: 24px 22px 20px 18px` | Four asymmetric corners is not a squircle — it reads as a rendering bug. Use `corner-shape` or a symmetric tier. |
| `snap-y snap-mandatory` on mobile | The page hosts a form and a Tally modal; mandatory snap traps touch scrolling and fights iOS address-bar resize. `snap-proximity` at most. |
| Splitting the add-item form into multiple screens | `item-form.tsx` is already correctly chunked (name → date/category → notes → actions). Splitting it would add friction, not reduce cognitive load. |
| Restructuring the 3-step first-run tour | `first-run-empty.tsx` already implements one idea per step. No change needed to the *structure* — Step 7 changes what step 3 *does* (commit instead of redirect), not how the steps are divided. |
| Adding a chart to the dashboard | `recharts` is a dependency but no chart exists. Expiry data is a triage list, not a time series — a chart would add an idea, not clarify one. |
| `UseBy`, `BestBefore`, `StillGood` as the new name | The best semantic fits in the category, but all three are registered on `.com`, `.io`, **and** `.app`. A rename that trades a distinctive name for a contested one is not a win. |
| Latin-derived names (`Perimo`, `Deficio`, `Evanesco`) | Read as pharmaceutical brands, and Latin marks are hard to police against similar coinages. |
| `Lapsive` as a candidate | Reads as "laxative". |

---

## Verification for any step

```bash
pnpm run typecheck                                        # primary gate
pnpm --filter @workspace/expiry-os run dev                # visual pass
```

Visual checklist for shape/motion changes: light **and** dark mode; a hover on an
items-list row (that is where `corner-shape: inherit` either works or does not);
and the OS "reduce motion" toggle.

---

## Compliance follow-ups

Findings from the legal-compliance audit that are **not** UI work. Ordered by
risk. Statutory figures are maximums, not expectations; none of this is legal
advice — have counsel review before launch.

### ✅ Fixed

- **Third-party font CDN (GDPR).** `index.html` and `index.css` loaded DM Sans,
  Outfit, and an unused Inter from `fonts.googleapis.com`, transmitting every
  visitor's IP to a US third party before any interaction. Fonts are now
  self-hosted via `@fontsource/dm-sans` and `@fontsource/outfit` (OFL-1.1) and
  bundled by Vite. The unused Inter link and both `preconnect` hints were
  removed.
- **Tally embed loaded before consent (GDPR / ePrivacy).** The embed script was a
  static `<script async>` that fired on every page view. It is now injected on
  first waitlist click (`src/lib/tally.ts`, memoised, 4s timeout, falls back to a
  new tab). The inert `data-tally-*` attributes were removed from all six CTAs
  so `onClick` is the single source of truth and cannot double-fire.
- **No transparency at the collection point (GDPR Art. 13).** Added a purpose and
  opt-out line directly under the landing CTA.
- **`notes` field invited sensitive identifiers (GDPR Art. 5(1)(c)).** The
  placeholder asked for "account numbers"; it now asks for a renewal reference
  and carries a "don't store passwords, card details, or ID numbers" helper.

### ⬜ Open

- **`/api/leads` is declared but unimplemented.** Documented with warnings in
  `lib/api-spec/openapi.yaml` and `lib/db/src/schema/leads.ts`. **Do not mount
  the route** until the table has `consented_at`, `source`, and
  `unsubscribe_token`. The SPA uses Tally instead.
- **No privacy policy or terms page.** Nothing links to one; `grep -i privacy`
  returns nothing. Required before launch — needs legal entity name, contact
  address, and the sub-processor list (Neon, Render, Netlify, Tally).
- **No unsubscribe path (CAN-SPAM / GDPR Art. 7(3)).** No email is sent today, so
  no violation exists yet. Before the first send: signed unsubscribe token,
  one-click endpoint, postal address in the footer, and honour opt-outs within
  10 business days.
- **No retention policy or user-facing erasure (Art. 5(1)(e), Art. 17).**
  `POST /session/reset` clears a room, but its only UI trigger is behind
  `SHOW_SAMPLE_BUTTON = false`. Abandoned rooms persist in Neon indefinitely. Add
  a "Delete my data" action and a scheduled sweep.
- **No processor agreements / transfer mechanism (Art. 28, Chapter V).** All five
  vendors are US-hosted. DPAs plus SCCs or the Data Privacy Framework.

### ⛔ Not applicable — do not spend effort

| Item | Why |
|---|---|
| Session replay / keystroke logging (CIPA) | Zero analytics, replay, or heatmap libraries exist. No exposure. |
| Age gate / COPPA | No signup, no accounts, general-audience tool. Add a "13 or older" line to the waitlist form only. |
| Auto-renewal disclosure / checkout | No payment code. Revisit if billing ships. |
| Upload content disclaimer | No upload feature exists. |
| Cookie consent banner | The only cookie is the strictly-necessary `expiryos_demo` session cookie (HttpOnly, SameSite=Lax, Secure in prod). ePrivacy Art. 5(3) exempts it — a banner would be theatre. Document it in the privacy policy instead. |
