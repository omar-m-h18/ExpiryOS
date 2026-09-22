import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

/**
 * These tests use an injected clock (`now`) instead of fake timers so window
 * expiry is exercised deterministically.
 *
 * The request/response stand-ins are deliberately loose (`any`): they only
 * need to satisfy the structural surface the limiter touches (client IP,
 * `setHeader`, `status`, `json`). Using the real Express types here would
 * require booting an HTTP server for what is pure middleware logic.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeRequest(ip: string): any {
  return { ip, socket: { remoteAddress: ip } };
}

function fakeResponse(): any {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown;

  return {
    get statusCode(): number {
      return statusCode;
    },
    get headers(): Record<string, string> {
      return headers;
    },
    get body(): unknown {
      return body;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };
}

/** Run one request through the limiter and report whether `next()` was called. */
function hit(limiter: ReturnType<typeof createRateLimiter>, ip: string) {
  const req = fakeRequest(ip);
  const res = fakeResponse();
  let passed = false;
  limiter(req, res, () => {
    passed = true;
  });
  return { passed, statusCode: res.statusCode as number, headers: res.headers as Record<string, string> };
}

describe("createRateLimiter", () => {
  it("allows up to `max` requests and blocks the next with 429", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });

    expect(hit(limiter, "1.2.3.4").passed).toBe(true);
    expect(hit(limiter, "1.2.3.4").passed).toBe(true);
    expect(hit(limiter, "1.2.3.4").passed).toBe(true);

    const blocked = hit(limiter, "1.2.3.4");
    expect(blocked.passed).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBe("60");
  });

  it("counts each key independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    expect(hit(limiter, "10.0.0.1").passed).toBe(true);
    expect(hit(limiter, "10.0.0.2").passed).toBe(true);
    expect(hit(limiter, "10.0.0.1").passed).toBe(false);
    expect(hit(limiter, "10.0.0.2").passed).toBe(false);
  });

  it("resets the window once it has elapsed", () => {
    let clock = 1_000;
    const limiter = createRateLimiter({
      windowMs: 5_000,
      max: 1,
      now: () => clock,
    });

    expect(hit(limiter, "9.9.9.9").passed).toBe(true);
    expect(hit(limiter, "9.9.9.9").passed).toBe(false);

    clock += 4_999;
    expect(hit(limiter, "9.9.9.9").passed).toBe(false);

    clock += 1;
    expect(hit(limiter, "9.9.9.9").passed).toBe(true);
  });

  it("reports a positive Retry-After even for sub-second windows", () => {
    const limiter = createRateLimiter({ windowMs: 200, max: 1 });
    hit(limiter, "5.5.5.5");
    const blocked = hit(limiter, "5.5.5.5");
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
  });

  it("bounds memory by evicting the oldest keys", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      maxTrackedKeys: 2,
    });

    // Fill two buckets, then add a third — the oldest ("a") must be evicted.
    expect(hit(limiter, "a").passed).toBe(true);
    expect(hit(limiter, "b").passed).toBe(true);
    expect(hit(limiter, "c").passed).toBe(true);

    // "a" was forgotten, so it starts a fresh window instead of being blocked.
    expect(hit(limiter, "a").passed).toBe(true);
  });

  it("supports a custom key function", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      key: (req: any) => String(req.ip).split(".").slice(0, 2).join("."),
    });

    // Both IPs share the /16 bucket, so the second request is blocked.
    expect(hit(limiter, "192.168.1.10").passed).toBe(true);
    expect(hit(limiter, "192.168.1.11").passed).toBe(false);
    // A different /16 is unaffected.
    expect(hit(limiter, "10.0.0.1").passed).toBe(true);
  });
});
