/**
 * Ephemeral anonymous session handling.
 *
 * Each visitor gets a private, temporary "room" identified by a random UUID
 * stored in a *signed* session cookie. Because the cookie has NO
 * `maxAge`/`expires`, it only lives as long as the browser session — closing
 * the browser (or a private window) discards it, and the next visit gets a
 * fresh room.
 *
 * ## Why the signature matters
 * `ownerId` is the tenancy key for every read and write (see
 * `IItemsRepository`). Without a MAC the cookie would be a client-asserted
 * identity: anyone who learned another visitor's id could set it as their own
 * cookie and read, modify, or — via `POST /session/reset` — delete that
 * room's data. Signing makes the id unforgeable, so the server remains the
 * only issuer.
 *
 * This is still a v1 demo mechanism: it separates visitors' data without
 * accounts.
 *
 * @module lib/session
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { CookieOptions } from "express";

export const SESSION_COOKIE = "expiryos_demo";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Dev/test-only signing key. A fixed value (rather than a per-process random
 * one) keeps demo rooms stable across `pnpm dev` restarts. It is never used in
 * production: the guard below refuses to boot without a real secret.
 */
const DEV_FALLBACK_SECRET = "expiryos-dev-only-insecure-session-secret";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET must be set in production. It signs the anonymous session " +
      "cookie; without it, visitor rooms would be forgeable. Generate one with " +
      "`openssl rand -base64 32` and set it in the environment (e.g. Render).",
  );
}

/** Read the signing key at call time so tests can set it per case. */
function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? DEV_FALLBACK_SECRET;
}

/** Canonical UUID v4 shape — the only thing an `ownerId` is allowed to be. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shared cookie attributes. `secure` is enabled only in production — both
 * Netlify and Render serve HTTPS there, but a `secure` cookie would never be
 * sent over plain HTTP on a local dev server.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
};

/** Result of {@link ensureSession}. */
export interface EnsuredSession {
  /** The visitor's session id ("room number"). */
  ownerId: string;
  /** True when this call minted the id (the visitor presented no valid cookie). */
  isNew: boolean;
}

/**
 * Produce the wire value for a session cookie: `<uuid>.<base64url-hmac>`.
 *
 * `base64url` never emits a `.`, so the first dot unambiguously separates the
 * id from its signature.
 */
function signOwnerId(ownerId: string): string {
  const mac = createHmac("sha256", sessionSecret()).update(ownerId).digest("base64url");
  return `${ownerId}.${mac}`;
}

/**
 * Validate a session cookie and return the id it authenticates, or `null` when
 * it is malformed, unsigned, or has been tampered with.
 *
 * Comparisons use {@link timingSafeEqual} so a forged MAC cannot be discovered
 * byte-by-byte through response-timing differences.
 */
function verifySessionCookie(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0 || separator === value.length - 1) {
    return null;
  }

  const ownerId = value.slice(0, separator);
  if (!UUID_RE.test(ownerId)) {
    return null;
  }

  const providedMac = Buffer.from(value.slice(separator + 1));
  const expectedMac = Buffer.from(
    createHmac("sha256", sessionSecret()).update(ownerId).digest("base64url"),
  );

  // timingSafeEqual throws on length mismatch, so check that first. The length
  // of a SHA-256 MAC is public information, so this leaks nothing sensitive.
  if (providedMac.length !== expectedMac.length) {
    return null;
  }

  return timingSafeEqual(providedMac, expectedMac) ? ownerId : null;
}

/**
 * Write a freshly signed session cookie for `ownerId`.
 *
 * Used both when minting a room and by the "start fresh" reset flow, so the
 * cookie format is only ever produced in one place.
 */
export function setSessionCookie(res: Response, ownerId: string): void {
  res.cookie(SESSION_COOKIE, signOwnerId(ownerId), {
    ...SESSION_COOKIE_OPTIONS,
    // NO maxAge / expires → session cookie, cleared when the browser closes.
  });
}

/**
 * Return the visitor's session id, minting and persisting a new one when the
 * presented cookie is missing, malformed, or fails signature verification.
 *
 * `isNew` tells the caller whether the room was just created. That matters:
 * sample data only needs seeding once per room, so the middleware can skip the
 * database round-trip on every subsequent request.
 *
 * A cookie value that is not a non-empty string is rejected before any string
 * work: `cookie-parser` parses `j:`-prefixed cookies into objects/arrays, and
 * without this guard a crafted cookie could put a non-string into `ownerId`
 * and from there into every database query.
 *
 * @param req - Express request (reads the cookie)
 * @param res - Express response (writes a new cookie only when minting)
 * @returns the session id for this visitor and whether it was just minted
 */
export function ensureSession(req: Request, res: Response): EnsuredSession {
  const raw = req.cookies?.[SESSION_COOKIE];

  if (typeof raw === "string" && raw.length > 0) {
    const verified = verifySessionCookie(raw);
    if (verified !== null) {
      return { ownerId: verified, isNew: false };
    }
  }

  const ownerId = randomUUID();
  setSessionCookie(res, ownerId);

  return { ownerId, isNew: true };
}

/**
 * Invalidate the visitor's session cookie.
 *
 * Used by the "reset demo" flow and when seeding a fresh room fails. The
 * client cannot clear an HttpOnly cookie itself, so the server must.
 *
 * @param res - Express response
 */
export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
}