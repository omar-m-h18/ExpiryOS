/**
 * Session routes — status check + "reset demo / start fresh".
 *
 * `GET /session`  → confirms the ephemeral session layer is alive.
 * `POST /session/reset` → starts a brand-new room for the visitor:
 *   the old room's items are deleted, a new session id is issued (overwriting
 *   the cookie), and the new room is immediately seeded with fresh sample
 *   data. This is how the "Start fresh" demo control works without requiring
 *   the visitor to close their browser.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import {
  SESSION_COOKIE,
  ensureSession,
} from "../lib/session";
import { deleteSessionItems, seedSessionIfNew } from "../lib/seed";

const router: IRouter = Router();

// GET /api/session
router.get("/session", async (req: Request, res: Response): Promise<void> => {
  // ensureSession guarantees a cookie exists (minted by requireSession).
  const ownerId = ensureSession(req, res);
  res.json({ demo: true, ownerId });
});

// POST /api/session/reset
router.post("/session/reset", async (req: Request, res: Response): Promise<void> => {
  const oldOwnerId = req.ownerId;

  // 1. Issue a brand-new room and write it back to the visitor's cookie.
  const newOwnerId = randomUUID();
  res.cookie(SESSION_COOKIE, newOwnerId, {
    httpOnly: true,
    sameSite: "lax",
    // No maxAge → still a session cookie (dies on browser close).
  });

  // 2. Drop the old room's data.
  await deleteSessionItems(oldOwnerId);

  // 3. Seed the fresh room so the dashboard isn't empty on the next load.
  await seedSessionIfNew(newOwnerId);

  res.json({ demo: true, reset: true, ownerId: newOwnerId });
});

export default router;
