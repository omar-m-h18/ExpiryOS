/**
 * Shared frontend utilities.
 *
 * @module lib/utils
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names, resolving conflicts correctly.
 *
 * Combines `clsx` (conditional class logic) with `tailwind-merge`
 * (deduplication of conflicting Tailwind utilities, e.g. `p-2` vs `p-4`).
 *
 * @param inputs - Any number of class values, conditionals, or arrays
 * @returns A single deduplicated class string
 *
 * @example
 * ```ts
 * cn("px-4 py-2", isActive && "bg-primary text-primary-foreground")
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a `YYYY-MM-DD` date string for human-readable display.
 *
 * Uses the user's local locale so dates render in a familiar format
 * (e.g. "Jul 21, 2026" in en-US, "21 Jul 2026" in en-GB).
 *
 * @param dateStr - ISO date string in `YYYY-MM-DD` format
 * @returns Locale-formatted date string, or `"Invalid date"` if input is malformed
 *
 * @example
 * ```ts
 * formatDate("2026-07-21") // → "Jul 21, 2026" (en-US)
 * ```
 */
export function formatDate(dateStr: string): string {
  // Append T00:00:00 to prevent UTC-midnight parsing which can shift the
  // displayed date by one day depending on the user's timezone offset.
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
