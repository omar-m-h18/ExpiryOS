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

import { eq } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import { generateSampleItems } from "./sample-data";

/**
 * Insert the default sample items for `ownerId` if that owner has none yet.
 *
 * @param ownerId - the ephemeral session id ("room number")
 */
export async function seedSessionIfNew(ownerId: string): Promise<void> {
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
    await tx.insert(itemsTable).values(rows);
  });
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
