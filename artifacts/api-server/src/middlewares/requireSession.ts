/**
 * requireSession — Express middleware that guarantees every request has an
 * ephemeral visitor session ("room").
 *
 * Responsibilities:
 *   1. Mint (or reuse) the visitor's session cookie → `req.ownerId`.
 *
 * This middleware is the "HTTP glue" between the cookie/session layer and the
 * repository layer. It is mounted globally in `app.ts` before the `/api` router.
 *
 * ## Why there is no seeding here any more
 *
 * This middleware used to insert eight example rows into every brand-new room
 * and wait for that work to finish before continuing. Two problems came from
 * it: a cold visitor cost eight writes whether or not they ever engaged, and
 * the wait existed only to keep the first screen from being empty.
 *
 * Rooms now start empty and this function does no database work at all. The
 * example roster still exists in `../seed` and is written only when a visitor
 * explicitly asks for it via `POST /api/session/reset`. The empty screen is
 * explained by the UI (`components/first-run`), not by the server.
 *
 * @module middlewares/requireSession
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ensureSession } from "../lib/session";

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
  // Synchronous by design: minting a room is a signed cookie write, nothing more.
  const { ownerId } = ensureSession(req, res);
  req.ownerId = ownerId;
  next();
};

export default requireSession;