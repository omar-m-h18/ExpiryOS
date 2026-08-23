import { describe, it, expect, beforeAll } from "vitest";
import { itemsRepository } from "./items.repository";

/**
 * Owner isolation is the single most important security guarantee: a visitor
 * must ONLY ever see/modify their own items. This is the cross-session leak we
 * absolutely cannot ship.
 *
 * These tests need a real PostgreSQL (via DATABASE_URL) and are gated behind
 * RUN_DB_TESTS=1 so they don't run in environments without a DB.
 */
const ready =
  typeof process !== "undefined" && process.env.RUN_DB_TESTS === "1";

describe.skipIf(!ready)("IItemsRepository owner isolation", () => {
  beforeAll(() => {
    // In a real DB-backed run we assume the schema is already applied.
  });

  it("findAll only returns the calling owner's items", async () => {
    await itemsRepository.create("ownerA", {
      title: "A secret",
      expiration_date: "2027-01-01",
    });
    await itemsRepository.create("ownerB", {
      title: "B secret",
      expiration_date: "2027-01-01",
    });

    const aItems = await itemsRepository.findAll("ownerA");
    const bItems = await itemsRepository.findAll("ownerB");

    const aTitles = aItems.map((i) => i.title);
    const bTitles = bItems.map((i) => i.title);

    expect(aTitles).toContain("A secret");
    expect(aTitles).not.toContain("B secret");
    expect(bTitles).toContain("B secret");
    expect(bTitles).not.toContain("A secret");
  });

  it("findById cannot read another owner's item", async () => {
    const created = await itemsRepository.create("ownerC", {
      title: "C item",
      expiration_date: "2027-01-01",
    });
    const fromOther = await itemsRepository.findById("ownerD", created.id);
    expect(fromOther).toBeNull();
  });

  it("delete cannot delete another owner's item", async () => {
    const created = await itemsRepository.create("ownerE", {
      title: "E item",
      expiration_date: "2027-01-01",
    });
    const deleted = await itemsRepository.delete("ownerF", created.id);
    expect(deleted).toBeNull();
    // The item must still exist for ownerE.
    const stillThere = await itemsRepository.findById("ownerE", created.id);
    expect(stillThere).not.toBeNull();
  });
});
