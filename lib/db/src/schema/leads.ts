import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

/**
 * Early-bird waitlist signups.
 *
 * ⚠️ COMPLIANCE — READ BEFORE USING THIS TABLE.
 *
 * Nothing writes to `leads` today. The `/api/leads` endpoint is declared in
 * `lib/api-spec/openapi.yaml` and the generated client exposes `useCreateLead`,
 * but no route file exists and `routes/index.ts` does not mount one, so
 * `POST /api/leads` currently 404s. The frontend collects waitlist emails
 * through Tally.so instead (see `src/lib/tally.ts` in the SPA).
 *
 * This table was left in place rather than deleted, so it is a live temptation
 * for the next person who notices the generated hook. Do not mount the route
 * until the table carries:
 *
 *   - `consented_at` — when consent was given, to evidence GDPR Art. 7(1)
 *   - `source`       — which CTA/form produced the signup (Art. 13 transparency)
 *   - `unsubscribe_token` — required for CAN-SPAM one-click opt-out, and for
 *     GDPR Art. 7(3) (withdrawal must be as easy as giving consent)
 *
 * Also required before any send: a physical postal address in the email
 * footer, a retention window, and a privacy notice linked at the collection
 * point. See the "Compliance follow-ups" section of ROADMAP.md.
 *
 * Kept intentionally minimal (email only) so it's trivial to export or migrate
 * to a marketing service later.
 */
export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeadSchema = z.object({
  email: z.string(),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
