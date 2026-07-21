/**
 * Items repository — database-abstraction layer.
 *
 * ## Why a repository layer?
 * The application is currently backed by PostgreSQL via Drizzle ORM. By
 * routing all database access through the `IItemsRepository` interface,
 * future contributors can swap storage backends without touching route
 * handlers or any other application code.
 *
 * ## Swapping the database backend
 * 1. Create a new file that implements `IItemsRepository`
 *    (e.g. `sqlite.repository.ts`, `mongo.repository.ts`).
 * 2. Change the `itemsRepository` export at the bottom of this file to
 *    return your new implementation.
 * 3. No route handlers, services, or tests need to change.
 *
 * ## Extension points
 * - **Caching**: wrap the repository with a caching decorator.
 * - **Events**: emit domain events from each mutating method.
 * - **Multi-tenancy**: add a `userId` / `tenantId` parameter to every method.
 *
 * @module repositories/items.repository
 */

import { eq, ilike, or, asc, desc } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import { EXPIRING_THIS_WEEK_DAYS } from "../config";
import {
  computeStatus,
  enrichItem,
  type EnrichedItem,
} from "../lib/status";

// ---------------------------------------------------------------------------
// Input / output types (database-agnostic)
// ---------------------------------------------------------------------------

export type SortDirection = "asc" | "desc";

export interface ListItemsOptions {
  search?: string;
  status?: "active" | "expiring_soon" | "expired";
  sort?: SortDirection;
}

export interface CreateItemData {
  title: string;
  category?: string | null;
  expiration_date: string;
  notes?: string | null;
}

/** All fields are optional; only supplied fields are updated. */
export type UpdateItemData = Partial<CreateItemData>;

export interface ItemsSummary {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  expiring_this_week: number;
}

// ---------------------------------------------------------------------------
// Interface — the contract every repository implementation must satisfy
// ---------------------------------------------------------------------------

/**
 * Repository interface for the items domain.
 *
 * All methods return plain objects (`EnrichedItem`, `ItemsSummary`), never
 * ORM-specific types, so consumers remain fully database-agnostic.
 */
export interface IItemsRepository {
  /** Return all items, optionally filtered and sorted. */
  findAll(options?: ListItemsOptions): Promise<EnrichedItem[]>;

  /** Return a single item by its UUID, or `null` if not found. */
  findById(id: string): Promise<EnrichedItem | null>;

  /** Insert a new item and return the enriched representation. */
  create(data: CreateItemData): Promise<EnrichedItem>;

  /**
   * Apply a partial update to an item.
   * Returns the updated item or `null` when no item with that ID exists.
   */
  update(id: string, data: UpdateItemData): Promise<EnrichedItem | null>;

  /**
   * Delete an item by ID.
   * Returns the deleted item or `null` when no item with that ID exists.
   */
  delete(id: string): Promise<EnrichedItem | null>;

  /** Compute aggregate status counts across all items. */
  getSummary(): Promise<ItemsSummary>;
}

// ---------------------------------------------------------------------------
// PostgreSQL / Drizzle implementation
// ---------------------------------------------------------------------------

/**
 * PostgreSQL-backed implementation of {@link IItemsRepository} using Drizzle ORM.
 *
 * This is the default production implementation. Replace `itemsRepository`
 * below to switch backends.
 */
class DrizzleItemsRepository implements IItemsRepository {
  async findAll(options: ListItemsOptions = {}): Promise<EnrichedItem[]> {
    const { search, status, sort = "asc" } = options;
    const sortDir = sort === "desc" ? desc : asc;

    let query = db.select().from(itemsTable);

    if (search) {
      query = query.where(
        or(
          ilike(itemsTable.title, `%${search}%`),
          ilike(itemsTable.category, `%${search}%`),
        ),
      ) as typeof query;
    }

    query = query.orderBy(sortDir(itemsTable.expirationDate)) as typeof query;

    const rows = await query;
    let enriched = rows.map(enrichItem);

    // Status filtering happens in-memory because `status` is a derived field
    // not stored in the database. For very large datasets consider a
    // generated/computed column or a materialized view.
    if (status) {
      enriched = enriched.filter((item) => item.status === status);
    }

    return enriched;
  }

  async findById(id: string): Promise<EnrichedItem | null> {
    const [row] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, id));

    return row ? enrichItem(row) : null;
  }

  async create(data: CreateItemData): Promise<EnrichedItem> {
    const [row] = await db
      .insert(itemsTable)
      .values({
        title: data.title,
        category: data.category ?? null,
        expirationDate: data.expiration_date,
        notes: data.notes ?? null,
      })
      .returning();

    return enrichItem(row);
  }

  async update(id: string, data: UpdateItemData): Promise<EnrichedItem | null> {
    // Build a sparse patch object — only include fields that were provided.
    // This ensures a PATCH truly behaves as a partial update.
    const patch: Partial<{
      title: string;
      category: string | null;
      expirationDate: string;
      notes: string | null;
    }> = {};

    if (data.title !== undefined) patch.title = data.title;
    if (data.category !== undefined) patch.category = data.category ?? null;
    if (data.expiration_date !== undefined) patch.expirationDate = data.expiration_date;
    if (data.notes !== undefined) patch.notes = data.notes ?? null;

    const [row] = await db
      .update(itemsTable)
      .set(patch)
      .where(eq(itemsTable.id, id))
      .returning();

    return row ? enrichItem(row) : null;
  }

  async delete(id: string): Promise<EnrichedItem | null> {
    const [row] = await db
      .delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .returning();

    return row ? enrichItem(row) : null;
  }

  async getSummary(): Promise<ItemsSummary> {
    // Fetch all rows and compute counts in-memory. Acceptable for typical
    // personal/team-sized datasets. For larger scale, replace with
    // database-level aggregation queries.
    const rows = await db.select().from(itemsTable);

    let active = 0;
    let expiring_soon = 0;
    let expired = 0;
    let expiring_this_week = 0;

    for (const row of rows) {
      const { status, days_remaining } = computeStatus(row.expirationDate);

      if (status === "active") active++;
      else if (status === "expiring_soon") expiring_soon++;
      else expired++;

      if (days_remaining >= 0 && days_remaining <= EXPIRING_THIS_WEEK_DAYS) {
        expiring_this_week++;
      }
    }

    return { total: rows.length, active, expiring_soon, expired, expiring_this_week };
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * The default repository instance backed by PostgreSQL/Drizzle.
 *
 * Import this wherever data access is needed. To swap implementations,
 * replace the assignment here — all consumers automatically use the new backend.
 *
 * @example
 * ```ts
 * import { itemsRepository } from "../repositories/items.repository";
 * const item = await itemsRepository.findById(id);
 * ```
 */
export const itemsRepository: IItemsRepository = new DrizzleItemsRepository();
