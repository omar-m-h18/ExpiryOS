# ExpiryOS v1 — Implementation Plan (Anonymous Demo + Waitlist)

> **Status:** Approved for implementation.
> **Audience:** An AI coding agent (Cline or any agent) following this without re-investigating the codebase. Modular coding is a first-class requirement — every feature is a small, independently testable module.

---

## Non-Technical Summary (for you, the human)

We're turning ExpiryOS from a tech demo into something you could actually launch. Here's what you get, in plain English:

- **A landing page** people see first — it clearly says "this is a live demo" and has a big **Start Demo** button.
- **A private, temporary demo room** for everyone who clicks Start. It's *their own* set of sample data, magically filled with realistic items (things expiring soon, things already expired). **Nobody else can see it**, and the moment they close their browser, it's gone — the next visit starts fresh. No login, no signup, no accounts.
- **An early-bird email box** on the landing page. If they like the demo, they type their email to join your waitlist (incentives to be decided later, but the emails get collected safely in your own database).
- **Zero new services.** Everything runs inside your own app — no Vercel, no Mailchimp, no third-party anything. Fully self-hosted.

The "modular" part means I'm building this as small, separate, easy-to-test pieces (a session module, a sample-data module, an email module, a landing-page module) instead of one giant tangled file. That makes it manageable, testable, and easiest for me to extend later without breaking things.

---

## How to read this document (for the agent)

- **Path** = workspace-relative path.
- Every step lists **exact files, functions, signatures, and behavior**.
- **Never hand-edit generated files** → run `pnpm --filter @workspace/api-spec run codegen` after changing OpenAPI.
- End every phase with `pnpm run typecheck`.

---

## 1. Goal & Approach

**Goal:** ship an v1 with a public landing page (demo + waitlist), private per-visitor ephemeral demo sessions (die on browser close), realistic seeded sample data, and self-hosted early-bird email capture — **no accounts, no Vercel, no 3rd-party services**.

**Approach — modular, layered:**

```
lib/session.ts        → manage ephemeral visitor identity (cookie)
lib/sample-data.ts    → generate realistic relative-dated sample items
lib/seed.ts           → seed a fresh session's items once
middlewares/requireSession.ts  → HTTP glue: mint/set/seed per request
repositories/items.repository.ts → scoped by ownerId (DB access)
repositories/leads.repository.ts  → waitlist email storage (DB access)
routes/items.ts       → thin HTTP, passes req.ownerId
routes/leads.ts       → POST /api/leads
routes/session.ts     → GET /api/session, POST /api/session/reset
(app.ts mounts cookieParser → requireSession → /api)
```

Each layer only imports from the layer(s) it needs; nothing reaches down into a sibling's internals.

### Non-functional goals
- **No new runtime dependencies** — reuse installed `cookie-parser`, `helmet`, `cors`, `crypto.web/randomUUID`.
- Explicit CORS: stop falling back to `origin: true`.
- Sample data dates are **always relative to today** (fresh on any first run).
- Cookie is ephemeral: **HttpOnly, SameSite=Lax, No Max-Age** → disappears on browser close.

---

## 2. Types

### 2.1 `Item.ownerId` (add) — `lib/db/src/schema/items.ts`
```ts
ownerId: text("owner_id").notNull(),
```
The anonymous session identifier ("room number"). Same column a future real-user/account phase reuses — no schema rework later.

### 2.2 `leadsTable` (new) — `lib/db/src/schema/leads.ts`
```ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.3 OpenAPI schemas (`lib/api-spec/openapi.yaml`)
- `LeadInput`: `{ email: string, format: email }`
- `Lead`: `{ id: string, email: string, created_at: string }`
- `SessionInfo`: `{ demo: boolean literal true }`

---

## 3. Files — added & modified

### Database (`lib/db/src/schema/`)
| File | Action | Detail |
|---|---|---|
| `items.ts` | modify | add `ownerId` column (2.1) |
| `leads.ts` | new | leads table (2.2) |
| `index.ts` | modify | add `export * from "./leads";` |

### Backend (`artifacts/api-server/src/`)
| File | Action | Detail |
|---|---|---|
| `lib/session.ts` | new | §4.1 |
| `lib/sample-data.ts` | new | §4.2 |
| `lib/seed.ts` | new | §4.3 |
| `middlewares/requireSession.ts` | new | §4.4 |
| `repositories/items.repository.ts` | modify | scope by ownerId (§4.5) |
| `repositories/leads.repository.ts` | new | §4.6 |
| `routes/items.ts` | modify | pass `req.ownerId` into repo |
| `routes/leads.ts` | new | `POST /api/leads` |
| `routes/session.ts` | new | `GET /api/session`, `POST /api/session/reset` |
| `routes/index.ts` | modify | mount leadsRouter, sessionRouter |
| `app.ts` | modify | `cookieParser()`, `requireSession`, cors hardening |

### API Contract (`lib/api-spec/`)
| File | Action | Detail |
|---|---|---|
| `openapi.yaml` | modify | add `/leads`, `/session` paths + schemas |

### Frontend (`artifacts/expiry-tracker/src/`)
| File | Action | Detail |
|---|---|---|
| `pages/landing.tsx` | new | hero + Start Demo + waitlist (§6) |
| `App.tsx` | modify | `/` → Landing; guard app under `/demo` |
| `components/demo-banner.tsx` | new | session banner + reset CTA |
| `components/layout.tsx` | modify | render banner (sidebar + mobile) |
| `lib/demo.ts` | new | thin client for `/session`, `/leads` |

---

## 4. Functions (module by module)

### 4.1 `lib/session.ts` — ephemeral identity
- `ensureSession(req: Request, res: Response): string`
  - Read cookie `expiryos_demo`.
  - Missing → `crypto.randomUUID()`, set via `res.cookie("expiryos_demo", id, { httpOnly: true, sameSite: "lax" })`. **No `maxAge`/`expires`** → session cookie dies on browser close.
  - Return the id.
- `clearSession(res: Response): void` → overwrite cookie with `maxAge: 0` (used by reset).

### 4.2 `lib/sample-data.ts` — `generateSampleItems(): CreateItemData[]`
- ~8 items, **all dates computed from one `const today = new Date()`**, never fixed literals.
- Export `dayOffsetISO(offsetDays: number): string` → clean `YYYY-MM-DD` local-midnight (matching `lib/status.ts` conventions). **Pure & testable.**
- Roster + offsets:
  | Title | Category | offset |
  |---|---|---|
  | Netflix subscription | Subscription | +42 |
  | SSL Certificate — checkout app | Subscription | +11 |
  | AWS Developer Account | Software | +5 |
  | Car Insurance — Policy A-2211 | Insurance | +2 |
  | Adobe Creative Cloud | Subscription | +30 |
  | Notary Public License | License | +23 |
  | Passport | Document | -9 |
  | Business Registration | Document | -95 |
- Each item: `{ title, category, expiration_date }` (omit notes). Mix yields active + expiring-this-week + expired.

### 4.3 `lib/seed.ts` — `seedSessionIfNew(ownerId: string): Promise<void>`
- Guard: if room already has ≥1 row → no-op.
- Else `itemsRepository.create(ownerId, item)` for each sample item.
- Run within a transaction (first-resolver wins).

### 4.4 `middlewares/requireSession.ts`
```ts
const requireSession: RequestHandler = (req, res, next) => {
  const ownerId = ensureSession(req, res);
  req.ownerId = ownerId;
  void seedSessionIfNew(ownerId);   // fire-and-forget, best-effort
  next();
};
```
- Extend `Req` typing: `req.ownerId: string`.

### 4.5 `repositories/items.repository.ts` — scope to owner
Every public method gains a leading `ownerId: string` param + `.where(eq(itemsTable.ownerId, ownerId))`:
- `findAll(ownerId, options)`
- `findById(ownerId, id)`
- `create(ownerId, data)` — sets `ownerId` on `.values(...)`
- `update(ownerId, id, data)`
- `delete(ownerId, id)`
- `getSummary(ownerId)`
Cross-room reads return empty/null; updates/deletes return `null`.

### 4.6 `repositories/leads.repository.ts`
- `createLead(email: string): Promise<{id: string, email: string, createdAt: Date}>`
  - normalize trim + lowercase.
  - Insert; on unique violation, return existing row. Idempotent.

### 4.7 `routes/leads.ts`
- `POST /api/leads` — parse (Zod `LeadInput`), `createLead`, return 201 (or 200 if existing).

### 4.8 `routes/session.ts`
- `GET /api/session` → `{ demo: true }` (proves session layer alive).
- `POST /api/session/reset` → `clearSession(res)` + delete owner's rows + re-seed (`resetSessionData`).

### 4.9 `resetSessionData(ownerId)` (in `lib/session.ts`)
- Delete all `itemsTable` rows for owner, then `seedSessionIfNew(ownerId)` again. Enables "Start fresh" within the same open browser.

---

## 5. Dependencies

- **No new runtime packages.** `cookie-parser` and `helmet` already installed (cookie-parser just not yet wired). `node:crypto` `randomUUID` is built-in.
- Dev/testing: optional `vitest` only if we add unit tests (§8).
- If esbuild bundling of `cookie-parser` errors during `artifact/api-server` build, add it to `build.mjs` `external` array (and confirm it can be externalized safely; otherwise it bundles — cookie-parser is pure JS and bundles fine).

---

## 6. Frontend — landing page + waitlist (modular)

### `pages/landing.tsx`
- **Hero**: "Track everything that expires." + subline that *clearly* states: "This is a **live demo** — private, with sample data. It resets when you close your browser." + waitlist note.
- **CTA**: primary button **Start Demo** → `navigate("/demo")`.
- **Waitlist form** (no redirects): email `Input`, inline validation via react-hook-form + zod (same pattern as `item-form.tsx`), busy-state button, success toast ("You're on the list!") + error toast.
- **Footer line**: "Early-bird incentives coming soon."

### `App.tsx` route change
- `/` → `Landing`.
- `/demo` → Dashboard; `/demo/items`, `/demo/items/new`, `/demo/items/:id/edit`.

### `components/demo-banner.tsx`
- Slim banner (not a modal): "Demo session — changes aren't saved." + **Start sample** button → `POST /api/session/reset` then invalidate queries.
- Rendered in `layout.tsx`: top of `main` for desktop **and** near the mobile tab bar.

### `lib/demo.ts`
- `resetDemoSession(): Promise<void>` → `POST /api/session/reset`.
- `insertLead(email)` client call against `POST /api/leads` via the existing `customFetch` helper.

---

## 7. Configuration / security
- `app.ts`: `app.use(cookieParser())` **before** session middleware and `/api`.
- CORS: require explicit `FRONTEND_URL` (deny if missing); restrict methods + `credentials: true`. **Stop** using the always-allowed `origin: true` fallback.
- `build.mjs` external list: add `cookie-parser` only if bundling fails (see §5).

---

## 8. Testing & Validation

### Automated (optional but recommended)
- `lib/sample-data.ts`: assert `dayOffset(0)` returns today; feed roster through `computeStatus` → expect mix contains `active`, `expiring_soon`, and `expired`.

### Manual checklist (human-verifiable)
1. `/` shows landing; **Start Demo** goes to `/demo`.
2. Dashboard appears with ~8 seeded items (active + expiring-this-week + expired).
3. Second browser window → **separate** own set; deleting in one doesn't affect the other.
4. Fully **close browser**, reopen → fresh sample room (nothing persists).
5. Click **Start a sample** → same browser, fresh data.
6. Invalid email shows inline error; valid → success toast; duplicate → "You're on the list".
7. Two visitors can't read each other's data (rows scoped by `ownerId`).

### Regression
- Dashboard counts match the seeded mix (`expiring_this_week ≥ 2`, `expired ≥ 1`).
- CRUD still works inside a room.

---

## 9. Implementation Order (exact sequence)

1. **Schema** — `items.ts` (+`ownerId`), new `leads.ts`, `index.ts`. Run `pnpm --filter @workspace/db run push`.
2. **`lib/session.ts`** (ensure/reset) + `middlewares/requireSession.ts`; install & mount `cookieParser()` in `app.ts`.
3. **`lib/sample-data.ts`** + **`lib/seed.ts`** (`seedSessionIfNew`) — pure modules first.
4. **Scope `items.repository.ts`** to `ownerId`.
5. **New routes** `leads.ts`, `session.ts`; pass `req.ownerId` in `items.ts`; mount in `routes/index.ts`.
6. **OpenAPI** `openapi.yaml` new paths/schemas → `pnpm --filter @workspace/api-spec run codegen`.
7. **Frontend** — `lib/demo.ts`, `pages/landing.tsx`, `components/demo-banner.tsx`, `App.tsx` route change, `layout.tsx` banner.
8. **CORS hardening** + run `pnpm run typecheck` + manual checklist (§8).

---

## Confirmed decisions (from user chat)
1. Email storage → your own Postgres `leads` table (self-hosted).
2. `/` = landing page, `/demo` = app.
3. Landing style → clean, minimal, on-brand with the existing app.
4. **No Vercel** anywhere.
5. **Modular coding** is a hard requirement.
