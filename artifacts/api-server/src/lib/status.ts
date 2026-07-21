/**
 * Expiry status computation.
 *
 * Status is NEVER stored in the database — it is always derived at request
 * time from the item's expiration_date and the current wall-clock date.
 * This ensures status updates happen automatically without background jobs
 * or any database writes.
 *
 * ## Status Thresholds
 * | Status          | Condition                                   |
 * |-----------------|---------------------------------------------|
 * | `"expired"`     | days_remaining < 0                          |
 * | `"expiring_soon"` | 0 ≤ days_remaining ≤ EXPIRING_SOON_DAYS   |
 * | `"active"`      | days_remaining > EXPIRING_SOON_DAYS         |
 *
 * The threshold is configurable via the `EXPIRING_SOON_DAYS` environment
 * variable (default: 30). See `config/index.ts`.
 *
 * @module lib/status
 */

import { EXPIRING_SOON_DAYS } from "../config";
import type { itemsTable } from "@workspace/db";

/** The three possible expiry states of a tracked item. */
export type ItemStatus = "active" | "expiring_soon" | "expired";

/** Return value of {@link computeStatus}. */
export interface StatusResult {
  status: ItemStatus;
  /** Positive = days until expiry. Negative = days since expiry. */
  days_remaining: number;
}

/**
 * Compute the expiry status and remaining days for a given expiration date.
 *
 * Dates are compared at midnight local time to avoid partial-day artifacts
 * caused by UTC-midnight boundary shifts.
 *
 * @param expirationDate - ISO date string in `YYYY-MM-DD` format
 * @returns Status classification and integer days until/since expiry
 */
export function computeStatus(expirationDate: string): StatusResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Append T00:00:00 to force local-timezone interpretation; without it,
  // `new Date("2026-07-21")` is parsed as UTC midnight which can produce
  // an off-by-one error depending on the server's timezone offset.
  const expiry = new Date(`${expirationDate}T00:00:00`);

  const diffMs = expiry.getTime() - today.getTime();
  const days_remaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let status: ItemStatus;
  if (days_remaining < 0) {
    status = "expired";
  } else if (days_remaining <= EXPIRING_SOON_DAYS) {
    status = "expiring_soon";
  } else {
    status = "active";
  }

  return { status, days_remaining };
}

/** The shape returned by the API for every enriched item. */
export interface EnrichedItem {
  id: string;
  title: string;
  category: string | null;
  expiration_date: string;
  notes: string | null;
  status: ItemStatus;
  days_remaining: number;
  created_at: string;
  updated_at: string;
}

/**
 * Enrich a raw database row with computed status fields.
 *
 * Converts Drizzle's camelCase column names to the snake_case API contract
 * and appends the derived `status` and `days_remaining` values.
 *
 * @param row - Raw row as returned by Drizzle from the items table
 * @returns API-ready item representation
 */
export function enrichItem(
  row: typeof itemsTable.$inferSelect,
): EnrichedItem {
  const { status, days_remaining } = computeStatus(row.expirationDate);
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? null,
    expiration_date: row.expirationDate,
    notes: row.notes ?? null,
    status,
    days_remaining,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
