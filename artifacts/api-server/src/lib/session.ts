/**
 * Ephemeral anonymous session handling.
 *
 * Each visitor gets a private, temporary "room" identified by a random UUID
 * stored in a session cookie. Because the cookie has NO `maxAge`/`expires`,
 * it only lives as long as the browser session — closing the browser (or a
 * private window) discards it, and the next visit gets a fresh room.
 *
 * This is a v1 demo mechanism: it separates visitors' data without accounts.
 * @module lib/session
 */

import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "expiryos_demo";

/**
 * Return the visitor's session id, minting and persisting a new one when absent.
 *
 * @param req - Express request (reads the cookie)
 * @param res - Express response (writes a new cookie only when minting)
 * @returns the session id for this visitor
 */
export function ensureSession(req: Request, res: Response): string {
  const existing = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (existing) {
    return existing;
  }

  const id = randomUUID();
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    // NO maxAge / expires → session cookie, cleared when the browser closes.
  });

  return id;
}

/**
 * Invalidate the visitor's session cookie.
 *
 * Used by the "reset demo" flow so the next request is treated as a brand-new
 * room. The client cannot clear an HttpOnly cookie itself, so the server must.
 *
 * @param res - Express response
 */
export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
  });
}
