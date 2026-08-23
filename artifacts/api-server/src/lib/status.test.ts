import { describe, it, expect } from "vitest";
import { computeStatus } from "./status";
import { EXPIRING_SOON_DAYS } from "../config";

/**
 * `computeStatus` is the heart of the product: it derives whether an item is
 * active, expiring soon, or expired from its date relative to *today*.
 *
 * These boundary cases are the high-risk ones — a 1-day off-by-one would show
 * the wrong status to users silently.
 */
describe("computeStatus", () => {
  const dayOffsetISO = (offset: number): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  it("treats today as expiring_soon (0 days remaining)", () => {
    const { status, days_remaining } = computeStatus(dayOffsetISO(0));
    expect(days_remaining).toBe(0);
    expect(status).toBe("expiring_soon");
  });

  it(`marks exactly EXPIRING_SOON_DAYS (${EXPIRING_SOON_DAYS}) as expiring_soon`, () => {
    const { status } = computeStatus(dayOffsetISO(EXPIRING_SOON_DAYS));
    expect(status).toBe("expiring_soon");
  });

  it("marks EXPIRING_SOON_DAYS+1 as active", () => {
    const { status } = computeStatus(dayOffsetISO(EXPIRING_SOON_DAYS + 1));
    expect(status).toBe("active");
  });

  it("marks future dates far out as active", () => {
    const { status, days_remaining } = computeStatus(dayOffsetISO(90));
    expect(status).toBe("active");
    expect(days_remaining).toBe(90);
  });

  it("marks a single day in the past as expired", () => {
    const { status, days_remaining } = computeStatus(dayOffsetISO(-1));
    expect(status).toBe("expired");
    expect(days_remaining).toBe(-1);
  });

  it("returns negative days for an expiry in the past", () => {
    const { days_remaining } = computeStatus(dayOffsetISO(-10));
    expect(days_remaining).toBeLessThan(0);
  });
});
