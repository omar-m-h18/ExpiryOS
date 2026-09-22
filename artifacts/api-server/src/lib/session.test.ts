import { describe, it, expect, afterEach } from "vitest";
import { clearSession, ensureSession, SESSION_COOKIE } from "./session";

/**
 * The session cookie is the tenancy key for every item query, so these tests
 * focus on the property that makes it safe: only the server can author a
 * value that verifies.
 *
 * `SESSION_SECRET` is read per call (not cached at import) precisely so these
 * cases can swap it — including forging a cookie with a different key.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeRequest(cookieValue?: unknown): any {
  return { cookies: cookieValue === undefined ? {} : { [SESSION_COOKIE]: cookieValue } };
}

function fakeResponse(): any {
  const setCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const clearedCookies: Array<{ name: string }> = [];

  return {
    get setCookies() {
      return setCookies;
    },
    get clearedCookies() {
      return clearedCookies;
    },
    cookie(name: string, value: string, options: Record<string, unknown>) {
      setCookies.push({ name, value, options });
      return this;
    },
    clearCookie(name: string) {
      clearedCookies.push({ name });
      return this;
    },
  };
}

describe("session cookie signing", () => {
  const originalSecret = process.env.SESSION_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSecret;
    }
  });

  it("mints a signed cookie and accepts it on the next request", () => {
    process.env.SESSION_SECRET = "test-secret-one";

    const firstRes = fakeResponse();
    const first = ensureSession(fakeRequest(), firstRes);

    expect(first.isNew).toBe(true);
    expect(UUID_RE.test(first.ownerId)).toBe(true);

    const cookie = firstRes.setCookies[0];
    expect(cookie.name).toBe(SESSION_COOKIE);
    expect(cookie.value.startsWith(`${first.ownerId}.`)).toBe(true);

    const second = ensureSession(fakeRequest(cookie.value), fakeResponse());
    expect(second.isNew).toBe(false);
    expect(second.ownerId).toBe(first.ownerId);
  });

  it("rejects an unsigned id (the pre-signing cookie format)", () => {
    process.env.SESSION_SECRET = "test-secret-one";

    const out = ensureSession(
      fakeRequest("11111111-2222-3333-4444-555555555555"),
      fakeResponse(),
    );

    expect(out.isNew).toBe(true);
    expect(out.ownerId).not.toBe("11111111-2222-3333-4444-555555555555");
  });

  it("rejects a tampered signature", () => {
    process.env.SESSION_SECRET = "test-secret-one";

    const res = fakeResponse();
    const first = ensureSession(fakeRequest(), res);
    const value = res.setCookies[0].value as string;
    const dot = value.lastIndexOf(".");
    const id = value.slice(0, dot);
    const mac = value.slice(dot + 1);
    const tampered = `${id}.${mac.slice(0, -1)}${mac.endsWith("A") ? "B" : "A"}`;

    const out = ensureSession(fakeRequest(tampered), fakeResponse());
    expect(out.isNew).toBe(true);
    expect(out.ownerId).not.toBe(first.ownerId);
  });

  it("rejects a cookie signed with a different secret (forgery)", () => {
    process.env.SESSION_SECRET = "test-secret-one";
    const res = fakeResponse();
    ensureSession(fakeRequest(), res);
    const forgedValue = res.setCookies[0].value as string;

    process.env.SESSION_SECRET = "test-secret-two";
    const out = ensureSession(fakeRequest(forgedValue), fakeResponse());

    expect(out.isNew).toBe(true);
  });

  it("rejects a valid MAC that has been moved onto a different id", () => {
    process.env.SESSION_SECRET = "test-secret-one";

    const res = fakeResponse();
    ensureSession(fakeRequest(), res);
    const mac = (res.setCookies[0].value as string).split(".")[1];
    const borrowedId = "99999999-8888-7777-6666-555555555555";

    const out = ensureSession(fakeRequest(`${borrowedId}.${mac}`), fakeResponse());

    expect(out.isNew).toBe(true);
    expect(out.ownerId).not.toBe(borrowedId);
  });

  it("rejects a non-UUID id even when it carries a MAC-shaped suffix", () => {
    process.env.SESSION_SECRET = "test-secret-one";

    const out = ensureSession(fakeRequest("not-a-uuid.abcdefghijkl"), fakeResponse());
    expect(out.isNew).toBe(true);
  });

  it("rejects object and array cookie values", () => {
    const fromObject = ensureSession(fakeRequest({ evil: true }), fakeResponse());
    const fromArray = ensureSession(fakeRequest(["a", "b"]), fakeResponse());

    expect(fromObject.isNew).toBe(true);
    expect(fromArray.isNew).toBe(true);
  });

  it("mints an httpOnly session cookie with no maxAge", () => {
    const res = fakeResponse();
    ensureSession(fakeRequest(), res);

    const options = res.setCookies[0].options as Record<string, unknown>;
    expect(options.httpOnly).toBe(true);
    expect(options.maxAge).toBeUndefined();
    expect(options.expires).toBeUndefined();
  });

  it("clearSession clears the session cookie", () => {
    const res = fakeResponse();
    clearSession(res);

    expect(res.clearedCookies).toEqual([{ name: SESSION_COOKIE }]);
  });
});