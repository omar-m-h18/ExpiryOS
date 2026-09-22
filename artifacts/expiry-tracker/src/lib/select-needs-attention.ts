/**
 * "Needs attention" selection for the dashboard.
 *
 * This lives outside the component for two reasons:
 *
 *   1. **It must never mutate its inputs.** The dashboard passes arrays that
 *      are held in the React Query cache; `Array.prototype.sort` mutates in
 *      place, which would silently reorder cached data for every other
 *      consumer of those query keys.
 *   2. It is pure, so it can be tested without rendering React.
 *
 * @module lib/select-needs-attention
 */

/** The only field this selection needs from an item. */
export interface UrgencyItem {
  /** Days until expiry; negative = already expired. Missing is treated as least urgent. */
  days_remaining?: number | null;
}

/** Default number of rows the dashboard renders. */
export const NEEDS_ATTENTION_LIMIT = 6;

/**
 * Return up to `limit` items, most urgent first: overdue items (closest to
 * today first), then items that are still valid but expiring soonest.
 *
 * @param expired - items whose status is `expired`
 * @param expiringSoon - items whose status is `expiring_soon`
 * @param limit - maximum number of items to return
 * @returns a new array; `expired` and `expiringSoon` are left untouched
 */
export function selectNeedsAttention<T extends UrgencyItem>(
  expired: readonly T[],
  expiringSoon: readonly T[],
  limit: number = NEEDS_ATTENTION_LIMIT,
): T[] {
  const byUrgency = (a: T, b: T): number =>
    (a.days_remaining ?? Number.POSITIVE_INFINITY) -
    (b.days_remaining ?? Number.POSITIVE_INFINITY);

  // Spread first: `.sort()` would otherwise reorder the caller's array.
  const mostOverdue = [...expired].sort(byUrgency);
  const soonest = [...expiringSoon].sort(byUrgency);

  return [...mostOverdue, ...soonest].slice(0, Math.max(0, limit));
}

/**
 * Return the non-expired item with the fewest days remaining, or `undefined`
 * when there is none.
 *
 * Used by the dashboard spotlight: when the server reports that exactly one
 * item is inside its "expiring this week" window, this finds that item without
 * the client needing to know the window's size. Re-deriving the window here
 * would drift from the server whenever `EXPIRING_THIS_WEEK_DAYS` changes.
 *
 * @param items - candidate items (may be `undefined` while loading)
 * @returns the soonest item expiring today or later, or `undefined`
 */
export function pickSoonestItem<T extends UrgencyItem>(
  items: readonly T[] | undefined,
): T | undefined {
  let soonest: T | undefined;

  for (const item of items ?? []) {
    const days = item.days_remaining;
    // Ignore already-expired items (negative) and unknown ones.
    if (typeof days !== "number" || !Number.isFinite(days) || days < 0) {
      continue;
    }
    if (soonest === undefined || days < (soonest.days_remaining as number)) {
      soonest = item;
    }
  }

  return soonest;
}