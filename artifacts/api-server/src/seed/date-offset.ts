/**
 * Local-midnight date arithmetic for sample items.
 *
 * Kept separate from the roster so this pure function can be unit tested on
 * its own, with no database or repository import in scope.
 *
 * @module seed/date-offset
 */

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