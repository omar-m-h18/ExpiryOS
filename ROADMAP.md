# Roadmap

Forward-looking UI/UX work for the SPA (`artifacts/expiry-tracker`).

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

## ⛔ Deliberately rejected

Recorded so these are not re-litigated later.

| Idea | Why not |
|---|---|
| `border-radius: 24px 22px 20px 18px` | Four asymmetric corners is not a squircle — it reads as a rendering bug. Use `corner-shape` or a symmetric tier. |
| `snap-y snap-mandatory` on mobile | The page hosts a form and a Tally modal; mandatory snap traps touch scrolling and fights iOS address-bar resize. `snap-proximity` at most. |
| Splitting the add-item form into multiple screens | `item-form.tsx` is already correctly chunked (name → date/category → notes → actions). Splitting it would add friction, not reduce cognitive load. |
| Restructuring the 3-step first-run tour | `first-run-empty.tsx` already implements one idea per step. No change needed. |
| Adding a chart to the dashboard | `recharts` is a dependency but no chart exists. Expiry data is a triage list, not a time series — a chart would add an idea, not clarify one. |

---

## Verification for any step

```bash
pnpm run typecheck                                        # primary gate
pnpm --filter @workspace/expiry-os run dev                # visual pass
```

Visual checklist for shape/motion changes: light **and** dark mode; a hover on an
items-list row (that is where `corner-shape: inherit` either works or does not);
and the OS "reduce motion" toggle.
