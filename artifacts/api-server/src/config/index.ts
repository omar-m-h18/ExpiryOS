/**
 * Application configuration.
 *
 * All tuneable values are loaded from environment variables so operators can
 * adjust behaviour without modifying source code. Defaults match the original
 * hard-coded values so existing deployments continue to work unchanged.
 *
 * @module config
 */

/**
 * Number of days within which an item is considered "expiring soon".
 * Controlled by the EXPIRING_SOON_DAYS environment variable.
 * @default 30
 */
export const EXPIRING_SOON_DAYS = Number(process.env.EXPIRING_SOON_DAYS ?? 30);

/**
 * Number of days within which an item is counted in the "expiring this week" summary bucket.
 * Controlled by the EXPIRING_THIS_WEEK_DAYS environment variable.
 * @default 7
 */
export const EXPIRING_THIS_WEEK_DAYS = Number(
  process.env.EXPIRING_THIS_WEEK_DAYS ?? 7,
);

/**
 * Human-readable application name surfaced in structured logs.
 * Controlled by the APP_NAME environment variable.
 * @default "ExpiryOS"
 */
export const APP_NAME = process.env.APP_NAME ?? "ExpiryOS";

/**
 * Parse a positive-integer environment variable, falling back to `fallback`
 * when it is unset or invalid.
 *
 * Guards against `NaN` / negative / zero values silently disabling limits:
 * `Number("abc")` is `NaN`, and every `>=` comparison against `NaN` is false,
 * which would make a cap unenforceable without any visible error.
 */
function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Maximum number of items a single anonymous demo room may hold.
 * Controlled by the MAX_ITEMS_PER_OWNER environment variable.
 * @default 100
 */
export const MAX_ITEMS_PER_OWNER = positiveInt(process.env.MAX_ITEMS_PER_OWNER, 100);

/**
 * Window length, in milliseconds, shared by every rate limiter.
 * Controlled by the RATE_LIMIT_WINDOW_MS environment variable.
 * @default 60000
 */
export const RATE_LIMIT_WINDOW_MS = positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

/**
 * Max requests per IP per window across the whole API (coarse safety net).
 * Controlled by the RATE_LIMIT_MAX_GLOBAL environment variable.
 * @default 300
 */
export const RATE_LIMIT_MAX_GLOBAL = positiveInt(process.env.RATE_LIMIT_MAX_GLOBAL, 300);

/**
 * Max waitlist signups per IP per window. The endpoint is public and writes a
 * permanent row, so it is deliberately tight.
 * Controlled by the RATE_LIMIT_MAX_LEADS environment variable.
 * @default 5
 */
export const RATE_LIMIT_MAX_LEADS = positiveInt(process.env.RATE_LIMIT_MAX_LEADS, 5);

/**
 * Max demo-session resets per IP per window.
 * Controlled by the RATE_LIMIT_MAX_RESET environment variable.
 * @default 10
 */
export const RATE_LIMIT_MAX_RESET = positiveInt(process.env.RATE_LIMIT_MAX_RESET, 10);

/**
 * Max item-creation requests per IP per window.
 * Controlled by the RATE_LIMIT_MAX_ITEM_WRITES environment variable.
 * @default 60
 */
export const RATE_LIMIT_MAX_ITEM_WRITES = positiveInt(
  process.env.RATE_LIMIT_MAX_ITEM_WRITES,
  60,
);
