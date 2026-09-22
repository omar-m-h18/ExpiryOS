import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Central error handler.
 *
 * Express routes several client-caused failures here with their own status —
 * most notably a malformed JSON body, which `express.json()` rejects with a
 * `SyntaxError` carrying `status: 400` (and `type: "entity.parse.failed"`), and
 * an oversized body, which carries `413`. Returning 500 for those mislabels a
 * caller's mistake as a server fault, so the status is honoured when present.
 *
 * Only genuine 5xx failures are logged at `error`; 4xx are logged at `warn`.
 * Responses stay generic either way so internal details never leak to clients.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = resolveStatus(err);
  const context = { err, method: req.method, path: req.path };

  if (status >= 500) {
    logger.error(context, "request failed");
  } else {
    logger.warn(context, "request rejected");
  }

  res.status(status).json({
    error: status >= 500 ? "Internal server error" : "Bad request",
  });
}

/**
 * Extract a valid HTTP status from a thrown value, defaulting to 500.
 *
 * Body-parser errors expose `status`; some libraries use `statusCode`. Values
 * outside 4xx/5xx (or non-numeric ones) are ignored — an error must never be
 * reported as a 2xx/3xx response.
 */
function resolveStatus(err: unknown): number {
  if (typeof err !== "object" || err === null) {
    return 500;
  }

  const carrier = err as { status?: unknown; statusCode?: unknown };
  const raw = carrier.status ?? carrier.statusCode;

  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 400 || raw > 599) {
    return 500;
  }

  return raw;
}