/**
 * Room seeding — the ONLY public surface of the seeding feature.
 *
 * Nothing outside this folder may import `sample-items` or `date-offset`
 * directly. Callers use `seedRoomIfEmpty` and `clearRoom` only.
 *
 * ## Why rooms are not seeded automatically
 *
 * `requireSession` used to seed every brand-new room with eight example rows.
 * That cost eight writes for every visitor, including the majority who only
 * look and never return, and it burned the free database tier's compute for
 * data nobody owned. New rooms now start empty. The roster is still here and is
 * written only when a visitor asks for it through `POST /api/session/reset`.
 *
 * This folder is also the boundary that will not port to a future self-hosted
 * build, where a single real user owns their own database and needs no demo
 * data at all.
 *
 * @module seed
 */

import { eq, sql } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import { generateSampleItems } from "./sample-items";

/** In-flight seeding promises per owner, so parallel callers share one seed. */
const inFlightSeeds = new Map<string, Promise<void>>();

/**
 * Insert the example rows for `ownerId`, but only if that room is still empty.
 *
 * Safe to call concurrently — parallel callers (e.g. two reset requests) share
 * the same in-flight promise instead of racing the idempotency check and writing
 * the rows twice.
 *
 * @param ownerId - the ephemeral session id ("room number")
 */
export function seedRoomIfEmpty(ownerId: string): Promise<void> {
  const prior = inFlightSeeds.get(ownerId);
  if (prior !== undefined) {
    return prior;
  }

  const attempt = insertIfEmpty(ownerId).finally(() => {
    // Clear the lock only if this exact attempt is still tracked, so a newer
    // seed that replaced it (extremely unlikely) isn't deleted underneath.
    if (inFlightSeeds.get(ownerId) === attempt) {
      inFlightSeeds.delete(ownerId);
    }
  });

  inFlightSeeds.set(ownerId, attempt);
  return attempt;
}

async function insertIfEmpty(ownerId: string): Promise<void> {
  // Fast path: if the room already holds something, avoid opening a
  // transaction just to discover that.
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
    // Serialize per room across *processes*. The in-memory `inFlightSeeds` map
    // only dedupes within a single instance, so two replicas serving the same
    // reset request could both pass the check above and insert the rows twice.
    // This transaction-scoped advisory lock makes the re-check below
    // authoritative; Postgres releases it automatically on commit or rollback.
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
 * Delete all of a room's items.
 *
 * Used by the "start fresh" flow so a visitor can discard their current room
 * and start a new one without closing the browser.
 *
 * @param ownerId - the ephemeral session id ("room number")
 */
export async function clearRoom(ownerId: string): Promise<void> {
  await db.delete(itemsTable).where(eq(itemsTable.ownerId, ownerId));
}