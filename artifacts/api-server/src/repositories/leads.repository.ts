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
 * the email is already present (via a pre-check, with a re-query safety net
 * on any unique-violation race).
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
  } catch {
    // Unique-violation race: read the existing row and return it.
    const [row] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.email, normalized))
      .limit(1);
    return row;
  }
}
