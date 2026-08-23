import { describe, it, expect } from "vitest";
import { dayOffsetISO, generateSampleItems } from "./sample-data";
import { computeStatus } from "./status";

/**
 * Sample data must always produce a realistic mix relative to today so a fresh
 * demo room is never empty and always exercises all three statuses.
 */
describe("sample-data", () => {
  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  it("dayOffsetISO(0) equals today (YYYY-MM-DD)", () => {
    expect(dayOffsetISO(0)).toBe(todayISO());
  });

  it("dayOffsetISO offsets correctly in days", () => {
    // +1 from today should differ by exactly one calendar day.
    const base = new Date(dayOffsetISO(0) + "T00:00:00");
    const next = new Date(dayOffsetISO(1) + "T00:00:00");
    const diffDays = Math.round((next.getTime() - base.getTime()) / 86_400_000);
    expect(diffDays).toBe(1);
  });

  it("generates a mix of active, expiring_soon, and expired", () => {
    const items = generateSampleItems();
    const statuses = items.map((i) => computeStatus(i.expiration_date).status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("expiring_soon");
    expect(statuses).toContain("expired");
  });

  it("generates a non-empty, unique-title roster", () => {
    const titles = generateSampleItems().map((i) => i.title);
    expect(titles.length).toBeGreaterThan(0);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
