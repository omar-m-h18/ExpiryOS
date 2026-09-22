/**
 * Session seeding — populates a brand-new anonymous room with realistic
 * sample data (once).
 *
 * Idempotent: if the room already owns at least one item, it's a no-op. This
 * lets the `requireSession` middleware safely fire-and-forget on every request
 * without worrying about double-seeding.
 *
 * @module lib/seed
 */

import { eq, sql } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import { generateSampleItems } from "./sample-data";

/** In-flight seeding promises per owner, so parallel first requests share one seed. */
const inFlightSeeds = new Map<string, Promise<void>>();

async function seedForOwner(ownerId: string): Promise<void> {
  // Fast path: most calls are for rooms that already have data, so avoid
  // opening a transaction just to discover that.
  const existing = await db
    .select({ id: itemsTable.id })
    .from(itemsTable)
    .where(eq(itemsTable.ownerId, ownerId))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  const rows = generateSampleItems().map((item) => ({
    ownerId,
    title: item.title,
    category: item.category ?? null,
    expirationDate: item.expiration_date,
    notes: item.notes ?? null,
  }));

  await db.transaction(async (tx) => {
    // Serialize seeding per room across *processes*. The in-memory
    // `inFlightSeeds` map above only dedupes within a single instance, so two
    // replicas (or two workers) serving a cold visitor at the same moment
    // could both pass the check above and insert 8 rows each. This
    // transaction-scoped advisory lock makes the re-check below authoritative;
    // Postgres releases it automatically on commit or rollback.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`);

    const alreadySeeded = await tx
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(eq(itemsTable.ownerId, ownerId))
      .limit(1);

    if (alreadySeeded.length > 0) {
      return;
    }

    await tx.insert(itemsTable).values(rows);
  });
}

/**
 * Insert the default sample items for `ownerId` if that owner has none yet.
 *
 * Safe to call concurrently — parallel callers (e.g. the dashboard's
 * simultaneous GETs on first paint) share the same in-flight seed instead of
 * racing the idempotency check and double-seeding a fresh room.
 *
 * @param ownerId - the ephemeral session id ("room number")
 */
export function seedSessionIfNew(ownerId: string): Promise<void> {
  const prior = inFlightSeeds.get(ownerId);
  if (prior !== undefined) {
    return prior;
  }

  const attempt = seedForOwner(ownerId).finally(() => {
    // Clear the lock only if this exact attempt is still tracked, so a newer
    // seed that replaced it (extremely unlikely) isn't deleted underneath.
    if (inFlightSeeds.get(ownerId) === attempt) {
      inFlightSeeds.delete(ownerId);
    }
  });

  inFlightSeeds.set(ownerId, attempt);
  return attempt;
}

/**
 * Delete all of an owner's items. Used by the "reset demo / start fresh"
 * flow so a visitor can discard their current room and start a new one
 * without closing the browser.
 *
 * @param ownerId - the ephemeral session id ("room number")
 */
export async function deleteSessionItems(ownerId: string): Promise<void> {
  await db.delete(itemsTable).where(eq(itemsTable.ownerId, ownerId));
}
