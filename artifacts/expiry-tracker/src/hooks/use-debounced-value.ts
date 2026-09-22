/**
 * useDebouncedValue — returns `value` only after it has stopped changing for
 * `delayMs`.
 *
 * Used by the items list so typing in the search box does not fire one API
 * request per keystroke. Each request is a `%term%` ILIKE scan the database
 * cannot index, so rapid-fire queries are disproportionately expensive.
 *
 * @module hooks/use-debounced-value
 */

import { useEffect, useState } from "react";

/** Default settle time for the search box. */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * @param value - the fast-changing value (e.g. raw input text)
 * @param delayMs - how long `value` must stay unchanged before it is emitted
 * @returns the latest `value` that has been stable for `delayMs`
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Cancel the pending update whenever the value changes again (or on
    // unmount), so only a settled value is ever committed.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}