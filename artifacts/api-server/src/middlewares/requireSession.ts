/**
 * requireSession — Express middleware that guarantees every request has an
 * ephemeral visitor session.
 *
 * Responsibilities:
 *   1. Mint (or reuse) the visitor's session cookie → `req.ownerId`.
 *   2. Seed realistic sample data exactly once, when a brand-new room is
 *      minted, so the first paint of the dashboard is never empty.
 *
 * This middleware is the "HTTP glue" between the cookie/session layer and the
 * repository layer. It is mounted globally in `app.ts` before the `/api` router.
 *
 * @module middlewares/requireSession
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { clearSession, ensureSession } from "../lib/session";
import { seedSessionIfNew } from "../lib/seed";
import { logger } from "../lib/logger";

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
  const { ownerId, isNew } = ensureSession(req, res);
  req.ownerId = ownerId;

  // Seed ONLY when this request minted the room. Seeding on every request
  // would (a) cost a database round-trip for existing visitors and (b) let a
  // client trigger sample-data inserts simply by presenting a fresh cookie
  // value, which is a cheap way to write rows without an account.
  if (!isNew) {
    next();
    return;
  }

  // Await the seed so the first page load cannot render an empty room: the
  // dashboard fires its GETs immediately, and a fire-and-forget seed would
  // race them.
  seedSessionIfNew(ownerId).then(
    () => {
      next();
    },
    (err: unknown) => {
      // Self-heal. The room is still empty, so drop its cookie and let the
      // next request mint a fresh room and retry, instead of stranding the
      // visitor in a permanently empty room.
      logger.error({ err }, "[requireSession] seeding failed; clearing room cookie");
      clearSession(res);
      next();
    },
  );
};

export default requireSession;