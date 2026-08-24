/**
 * Leads repository — database access for the early-bird waitlist.
 *
 * Emails are normalized (trimmed + lowercased) and stored uniquely, so a
 * repeat signup returns the existing row instead of duplicating (idempotent).
 *
 * @module repositories/leads.repository
 */

import { eq } from "drizzle-orm";
import { db, leadsTable, type Lead } from "@workspace/db";

/**
 * Register an email on the waitlist. Idempotent — returns the existing row if
 * the email is already present.
 *
 * Only the "unique_violation" case is treated as "already exists". Any other
 * DB error (connection down, missing schema) is allowed to propagate so the
 * global error handler surfaces it instead of being silently swallowed.
 *
 * @param email - raw email string (will be trimmed + lowercased)
 * @returns the saved lead row
 */
export async function createLead(email: string): Promise<Lead> {
  const normalized = email.trim().toLowerCase();

  const existing = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.email, normalized))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  try {
    const [row] = await db
      .insert(leadsTable)
      .values({ email: normalized })
      .returning();
    return row;
  } catch (err) {
    // Only a unique violation (race between the pre-check and insert) should
    // be treated as "already exists". Real errors must not be swallowed.
    const isUniqueViolation =
      typeof err === "object" &&
      err !== null &&
      (err as { code?: unknown }).code === "23505";
    if (isUniqueViolation) {
      const [row] = await db
        .select()
        .from(leadsTable)
        .where(eq(leadsTable.email, normalized))
        .limit(1);
      if (row) {
        return row;
      }
    }
    throw err;
  }
}
