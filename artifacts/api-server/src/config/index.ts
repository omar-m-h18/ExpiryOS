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
