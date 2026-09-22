import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { itemsRepository } from "./items.repository";

/**
 * Owner isolation is the single most important security guarantee: a visitor
 * must ONLY ever see/modify their own items. This is the cross-session leak we
 * absolutely cannot ship.
 *
 * These tests need a real PostgreSQL (via DATABASE_URL) and are gated behind
 * RUN_DB_TESTS=1 so they don't run in environments without a DB.
 *
 * Two deliberate properties:
 *   - Every owner id is unique per run, so a row left behind by an earlier run
 *     can never accidentally satisfy an assertion.
 *   - Everything created is deleted in `afterAll`, so the shared database is
 *     left as it was found.
 */
const ready =
  typeof process !== "undefined" && process.env.RUN_DB_TESTS === "1";

describe.skipIf(!ready)("IItemsRepository owner isolation", () => {
  const runId = randomUUID();
  const owner = (label: string) => `test-${runId}-${label}`;

  const created: Array<{ ownerId: string; id: string }> = [];

  async function createItem(ownerId: string, title: string) {
    const item = await itemsRepository.create(ownerId, {
      title,
      expiration_date: "2027-01-01",
    });
    created.push({ ownerId, id: item.id });
    return item;
  }

  afterAll(async () => {
    // Best-effort cleanup: leave no test rows behind.
    for (const { ownerId, id } of created) {
      await itemsRepository.delete(ownerId, id);
    }
  });

  it("findAll only returns the calling owner's items", async () => {
    const ownerA = owner("A");
    const ownerB = owner("B");

    await createItem(ownerA, "A secret");
    await createItem(ownerB, "B secret");

    const aTitles = (await itemsRepository.findAll(ownerA)).map((i) => i.title);
    const bTitles = (await itemsRepository.findAll(ownerB)).map((i) => i.title);

    // Exact equality (not `toContain`): the owner id is unique to this run, so
    // any extra row would be a real leak.
    expect(aTitles).toEqual(["A secret"]);
    expect(bTitles).toEqual(["B secret"]);
  });

  it("findById cannot read another owner's item", async () => {
    const ownerC = owner("C");
    const ownerD = owner("D");

    const item = await createItem(ownerC, "C item");

    expect(await itemsRepository.findById(ownerD, item.id)).toBeNull();
    expect(await itemsRepository.findById(ownerC, item.id)).not.toBeNull();
  });

  it("delete cannot delete another owner's item", async () => {
    const ownerE = owner("E");
    const ownerF = owner("F");

    const item = await createItem(ownerE, "E item");

    expect(await itemsRepository.delete(ownerF, item.id)).toBeNull();
    // The item must still exist for ownerE.
    expect(await itemsRepository.findById(ownerE, item.id)).not.toBeNull();
  });

  it("update cannot modify another owner's item", async () => {
    const ownerG = owner("G");
    const ownerH = owner("H");

    const item = await createItem(ownerG, "G item");

    expect(
      await itemsRepository.update(ownerH, item.id, { title: "hijacked" }),
    ).toBeNull();
    expect((await itemsRepository.findById(ownerG, item.id))?.title).toBe("G item");
  });

  it("count is scoped to the calling owner", async () => {
    const ownerI = owner("I");
    const ownerJ = owner("J");

    await createItem(ownerI, "I one");
    await createItem(ownerI, "I two");

    expect(await itemsRepository.count(ownerI)).toBe(2);
    expect(await itemsRepository.count(ownerJ)).toBe(0);
  });

  it("getSummary is scoped to the calling owner", async () => {
    const ownerK = owner("K");
    const ownerL = owner("L");

    await createItem(ownerK, "K item");

    expect((await itemsRepository.getSummary(ownerK)).total).toBe(1);
    expect((await itemsRepository.getSummary(ownerL)).total).toBe(0);
  });

  it("update with an empty patch is a no-op that returns the item", async () => {
    const ownerM = owner("M");

    const item = await createItem(ownerM, "M item");

    // An empty patch must not throw (it would build an empty SQL SET clause).
    const result = await itemsRepository.update(ownerM, item.id, {});
    expect(result?.id).toBe(item.id);
    expect(result?.title).toBe("M item");
  });
});