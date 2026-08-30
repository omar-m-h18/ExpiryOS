import { pgTable, text, date, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const itemsTable = pgTable("items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  expirationDate: date("expiration_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertItemSchema = z.object({
  ownerId: z.string(),
  title: z.string(),
  category: z.string().nullish(),
  expirationDate: z.string(),
  notes: z.string().nullish(),
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
