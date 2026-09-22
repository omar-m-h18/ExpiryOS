/**
 * Filter vocabulary for the items list.
 *
 * Kept separate from `hooks/use-item-filters` so the URL parsing is a pure
 * function that can be tested without React or a router.
 *
 * @module lib/item-filters
 */

/** The status filter, including the `"all"` pseudo-status. */
export type FilterStatus = "all" | "active" | "expiring_soon" | "expired";

/** Sort direction for the expiration date column. */
export type SortDirection = "asc" | "desc";

/** Every value `?status=` may legitimately carry. */
export const VALID_STATUSES: readonly FilterStatus[] = [
  "all",
  "active",
  "expiring_soon",
  "expired",
];

/**
 * Read a `status` value out of a URL search string.
 *
 * Unknown or missing values fall back to `"all"`, so a hand-edited or stale
 * URL can never put the list into an invalid filter state.
 *
 * @param search - URL search string, with or without a leading `?`
 * @returns the filter encoded in the URL, or `"all"`
 */
export function parseStatusParam(search: string): FilterStatus {
  const param = new URLSearchParams(search).get("status");
  return VALID_STATUSES.includes(param as FilterStatus)
    ? (param as FilterStatus)
    : "all";
}