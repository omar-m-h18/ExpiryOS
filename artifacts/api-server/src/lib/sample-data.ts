/**
 * Realistic sample data for anonymous demo rooms.
 *
 * The critical invariant: every date is computed relative to *today*, so the
 * demo always looks alive regardless of when it's opened — there's always a mix
 * of Active, Expiring-This-Week, Expiring-Soon, and Expired items, and the
 * "needs attention" / "expiring this week" spots on the dashboard light up.
 *
 * @module lib/sample-data
 */

import type { CreateItemData } from "../repositories/items.repository";

/** Roster of sample items and their expiry offset from today (in days). */
interface SampleItemSpec {
  title: string;
  category: string;
  /** Days from today; negative = already expired. */
  offsetDays: number;
}

const SAMPLE_SPECS: SampleItemSpec[] = [
  { title: "Netflix subscription", category: "Subscription", offsetDays: 42 },
  { title: "SSL Certificate — checkout app", category: "Subscription", offsetDays: 11 },
  { title: "AWS Developer Account", category: "Software", offsetDays: 5 },
  { title: "Car Insurance — Policy A-2211", category: "Insurance", offsetDays: 2 },
  { title: "Adobe Creative Cloud", category: "Subscription", offsetDays: 30 },
  { title: "Notary Public License", category: "License", offsetDays: 23 },
  { title: "Passport", category: "Document", offsetDays: -9 },
  { title: "Business Registration", category: "Document", offsetDays: -95 },
];

/**
 * Return a `YYYY-MM-DD` string `offsetDays` from today, interpreted as local
 * midnight (matching `lib/status.ts` conventions to avoid UTC off-by-ones).
 *
 * Pure function — safe to unit test.
 *
 * @param offsetDays - number of days to offset from today (may be negative)
 * @returns ISO date string in `YYYY-MM-DD` form
 */
export function dayOffsetISO(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Build the full set of sample items with today-relative expiration dates.
 *
 * @returns array of items ready to be inserted for a fresh owner
 */
export function generateSampleItems(): CreateItemData[] {
  return SAMPLE_SPECS.map((spec) => ({
    title: spec.title,
    category: spec.category,
    expiration_date: dayOffsetISO(spec.offsetDays),
  }));
}