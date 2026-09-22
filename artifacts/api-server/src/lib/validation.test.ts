import { describe, it, expect } from "vitest";
import {
  ITEM_LIMITS,
  escapeLikePattern,
  findItemFieldError,
  isValidDateOnly,
} from "./validation";

/**
 * These checks are the difference between a client error (400) and a server
 * error (500): the Postgres `date` column rejects anything that is not a real
 * date, and `computeStatus` would classify an unparseable date as "active"
 * because comparisons against `NaN` are always false.
 */
describe("isValidDateOnly", () => {
  it("accepts real calendar dates", () => {
    expect(isValidDateOnly("2026-01-01")).toBe(true);
    expect(isValidDateOnly("1970-01-01")).toBe(true);
    expect(isValidDateOnly("9999-12-31")).toBe(true);
    expect(isValidDateOnly("2024-02-29")).toBe(true); // leap year
  });

  it("rejects malformed strings", () => {
    expect(isValidDateOnly("banana")).toBe(false);
    expect(isValidDateOnly("")).toBe(false);
    expect(isValidDateOnly("2026-7-1")).toBe(false); // not zero-padded
    expect(isValidDateOnly("26-07-21")).toBe(false); // two-digit year
    expect(isValidDateOnly("2026/07/21")).toBe(false); // wrong separator
    expect(isValidDateOnly("2026-07-21T00:00:00Z")).toBe(false); // has time
    expect(isValidDateOnly("2026-07-21 ")).toBe(false); // trailing space
  });

  it("rejects impossible dates that Date.parse would roll over", () => {
    expect(isValidDateOnly("2026-02-31")).toBe(false);
    expect(isValidDateOnly("2026-02-30")).toBe(false);
    expect(isValidDateOnly("2025-02-29")).toBe(false); // not a leap year
    expect(isValidDateOnly("2026-13-01")).toBe(false); // month 13
    expect(isValidDateOnly("2026-00-01")).toBe(false); // month 0
    expect(isValidDateOnly("2026-01-32")).toBe(false); // day 32
    expect(isValidDateOnly("2026-01-00")).toBe(false); // day 0
  });

  it("rejects non-string values", () => {
    expect(isValidDateOnly(null)).toBe(false);
    expect(isValidDateOnly(undefined)).toBe(false);
    expect(isValidDateOnly(20260721)).toBe(false);
    expect(isValidDateOnly(true)).toBe(false);
    expect(isValidDateOnly({})).toBe(false);
    expect(isValidDateOnly(["2026-07-21"])).toBe(false);
  });

  it("accepts the lower year boundary without the Date.UTC two-digit remap", () => {
    // `Date.UTC(99, ...)` would otherwise be interpreted as 1999.
    expect(isValidDateOnly("0099-01-01")).toBe(true);
    expect(isValidDateOnly("0001-01-01")).toBe(true);
  });
});

describe("findItemFieldError", () => {
  const valid = { title: "Passport", expiration_date: "2027-01-01" };

  it("returns null for a valid payload", () => {
    expect(findItemFieldError(valid)).toBeNull();
    expect(findItemFieldError({})).toBeNull();
  });

  it("flags an invalid expiration date", () => {
    expect(findItemFieldError({ ...valid, expiration_date: "banana" })).toMatch(
      /expiration_date/,
    );
    expect(findItemFieldError({ ...valid, expiration_date: "2026-02-31" })).toMatch(
      /expiration_date/,
    );
  });

  it("does not require expiration_date (PATCH may omit it)", () => {
    expect(findItemFieldError({ expiration_date: undefined })).toBeNull();
    expect(findItemFieldError({ expiration_date: null })).toBeNull();
  });

  it("enforces the title length limit", () => {
    expect(findItemFieldError({ ...valid, title: "x".repeat(ITEM_LIMITS.title) })).toBeNull();
    expect(
      findItemFieldError({ ...valid, title: "x".repeat(ITEM_LIMITS.title + 1) }),
    ).toMatch(/title/);
  });

  it("enforces the category and notes length limits", () => {
    expect(
      findItemFieldError({ ...valid, category: "c".repeat(ITEM_LIMITS.category + 1) }),
    ).toMatch(/category/);
    expect(
      findItemFieldError({ ...valid, notes: "n".repeat(ITEM_LIMITS.notes + 1) }),
    ).toMatch(/notes/);
  });

  it("allows null category and notes", () => {
    expect(findItemFieldError({ ...valid, category: null, notes: null })).toBeNull();
  });
});

describe("escapeLikePattern", () => {
  it("escapes the LIKE metacharacters % and _", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("%%__")).toBe("\\%\\%\\_\\_");
  });

  it("escapes a literal backslash (the escape character itself)", () => {
    expect(escapeLikePattern("c\\d")).toBe("c\\\\d");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("passport")).toBe("passport");
    expect(escapeLikePattern("SSL Certificate — checkout")).toBe("SSL Certificate — checkout");
    expect(escapeLikePattern("")).toBe("");
  });

  it("handles a mixture", () => {
    expect(escapeLikePattern("100%_cover\\")).toBe("100\\%\\_cover\\\\");
  });
});