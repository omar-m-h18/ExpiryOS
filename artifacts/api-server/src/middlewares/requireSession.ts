/**
 * requireSession — Express middleware that guarantees every request has an
 * ephemeral visitor session.
 *
 * Responsibilities:
 *   1. Mint (or reuse) the visitor's session cookie → `req.ownerId`.
 *   2. Best-effort seed of realistic sample data on a brand-new room so the
 *      first paint of the dashboard is never empty.
 *
 * This middleware is the "HTTP glue" between the cookie/session layer and the
 * repository layer. It is mounted globally in `app.ts` before the `/api` router.
 *
 * @module middlewares/requireSession
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ensureSession } from "../lib/session";
import { seedSessionIfNew } from "../lib/seed";

// Extend Express's Request so `req.ownerId` is available and typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The ephemeral anonymous session id ("room number") for this visitor. */
      ownerId: string;
    }
  }
}

const requireSession: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const ownerId = ensureSession(req, res);
  req.ownerId = ownerId;

  // Fire-and-forget, best-effort seeding so we never block the response.
  // seedSessionIfNew is idempotent — it no-ops if the room already has items.
  void seedSessionIfNew(ownerId).catch((err) => {
    console.error("[requireSession] seeding failed", err);
  });

  next();
};

export default requireSession;
