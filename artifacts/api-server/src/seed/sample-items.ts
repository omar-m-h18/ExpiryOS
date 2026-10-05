/**
 * The roster of example items offered to a visitor who asks for them.
 *
 * Rooms are NOT seeded automatically any more (see `middlewares/requireSession`).
 * These rows are written only when a visitor explicitly asks for examples via
 * `POST /api/session/reset`. That keeps the demo cheap for the many visitors who
 * only look, while still giving anyone who wants a populated screen one click.
 *
 * The critical invariant: every date is computed relative to *today*, so the
 * examples always look alive regardless of when they are opened — there is
 * always a mix of Active, Expiring-Soon, and Expired items.
 *
 * @module seed/sample-items
 */

import type { CreateItemData } from "../repositories/items.repository";
import { dayOffsetISO } from "./date-offset";

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