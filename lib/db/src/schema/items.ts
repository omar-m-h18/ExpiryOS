import { pgTable, text, date, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";

export const itemsTable = pgTable(
  "items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    category: text("category"),
    expirationDate: date("expiration_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    // Every item query is scoped by `owner_id`, and the list query additionally
    // sorts by `expiration_date`. One composite index serves all of them:
    //   - `owner_id = ?` lookups use its leftmost prefix (count/summary/delete)
    //   - `owner_id = ? ORDER BY expiration_date` is served by the index alone,
    //     so no sequential scan and no separate sort step.
    // A separate `owner_id`-only index would be redundant.
    // NOTE: the `search` ILIKE '%…%' path cannot use a btree index; that would
    // need a `pg_trgm` GIN index, which drizzle-kit does not create for us.
    index("items_owner_id_expiration_date_idx").on(
      table.ownerId,
      table.expirationDate,
    ),
  ],
);

export const insertItemSchema = z.object({
  ownerId: z.string(),
  title: z.string(),
  category: z.string().nullish(),
  expirationDate: z.string(),
  notes: z.string().nullish(),
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
