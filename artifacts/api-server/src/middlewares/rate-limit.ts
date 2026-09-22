/**
 * Dependency-free fixed-window rate limiter.
 *
 * ## Why hand-rolled?
 * The API's public write endpoints (waitlist signups, demo-session resets,
 * item creation) are unauthenticated and each request can persist rows. A
 * single IP could otherwise mint unlimited anonymous rooms, and every fresh
 * room is seeded with sample data — a cheap way to fill the database. This
 * middleware caps that.
 *
 * ## Single-instance caveat
 * Buckets live in this process's memory. Behind multiple API replicas each
 * replica enforces its own counters, so the effective limit is
 * `max × replicas`. Move the counters to a shared store (Redis) before
 * scaling horizontally.
 *
 * @module middlewares/rate-limit
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Options for {@link createRateLimiter}. */
export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed per key per window. */
  max: number;
  /**
   * Derive the bucket key for a request. Defaults to the client IP, which
   * requires Express's `trust proxy` setting to be correct behind a proxy.
   */
  key?: (req: Request) => string;
  /** `error` value returned in the 429 body. */
  message?: string;
  /** Injectable clock — lets tests advance time without fake timers. */
  now?: () => number;
  /**
   * Upper bound on simultaneously tracked keys. When exceeded, the oldest
   * keys are evicted so a spray of unique IPs cannot grow memory without
   * limit. Defaults to 50 000.
   */
  maxTrackedKeys?: number;
}

interface Bucket {
  /** Requests observed in the current window. */
  count: number;
  /** Epoch millis at which the current window ends. */
  resetAt: number;
}

const DEFAULT_MAX_TRACKED_KEYS = 50_000;

/** How often expired buckets are swept out of the map. */
const SWEEP_INTERVAL_MS = 60_000;

/** Default key: the client IP address. */
function clientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/**
 * Create an Express middleware that allows at most `max` requests per key per
 * `windowMs`. Requests over the limit receive `429` with a `Retry-After`
 * header; all other requests pass through untouched.
 *
 * @example
 * ```ts
 * router.post("/leads", createRateLimiter({ windowMs: 60_000, max: 5 }), handler);
 * ```
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const {
    windowMs,
    max,
    key = clientIp,
    message = "Too many requests",
    now = Date.now,
    maxTrackedKeys = DEFAULT_MAX_TRACKED_KEYS,
  } = options;

  const buckets = new Map<string, Bucket>();
  let lastSweep = now();

  /** Drop buckets whose window has ended. Called at most once per interval. */
  function sweep(currentTime: number): void {
    for (const [bucketKey, bucket] of buckets) {
      if (currentTime >= bucket.resetAt) {
        buckets.delete(bucketKey);
      }
    }
    lastSweep = currentTime;
  }

  /** Evict oldest entries (Map preserves insertion order) to bound memory. */
  function evictOldest(count: number): void {
    let removed = 0;
    for (const oldestKey of buckets.keys()) {
      buckets.delete(oldestKey);
      removed += 1;
      if (removed >= count) break;
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const currentTime = now();

    if (currentTime - lastSweep >= SWEEP_INTERVAL_MS) {
      sweep(currentTime);
    }

    const bucketKey = key(req);
    let bucket = buckets.get(bucketKey);

    if (bucket === undefined) {
      if (buckets.size >= maxTrackedKeys) {
        evictOldest(buckets.size - maxTrackedKeys + 1);
      }
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(bucketKey, bucket);
    } else if (currentTime >= bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = currentTime + windowMs;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - currentTime) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
