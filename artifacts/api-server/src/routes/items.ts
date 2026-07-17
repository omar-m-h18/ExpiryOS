import { Router, type IRouter } from "express";
import { eq, ilike, or, asc, desc } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import {
  ListItemsQueryParams,
  CreateItemBody,
  GetItemParams,
  UpdateItemParams,
  UpdateItemBody,
  DeleteItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

/** Calculate status and days_remaining from expiration_date string (YYYY-MM-DD) */
function computeStatus(expirationDate: string): {
  status: "active" | "expiring_soon" | "expired";
  days_remaining: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate + "T00:00:00");
  const diffMs = expiry.getTime() - today.getTime();
  const days_remaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let status: "active" | "expiring_soon" | "expired";
  if (days_remaining < 0) {
    status = "expired";
  } else if (days_remaining <= 30) {
    status = "expiring_soon";
  } else {
    status = "active";
  }

  return { status, days_remaining };
}

function enrichItem(item: typeof itemsTable.$inferSelect) {
  const { status, days_remaining } = computeStatus(item.expirationDate);
  return {
    id: item.id,
    title: item.title,
    category: item.category ?? null,
    expiration_date: item.expirationDate,
    notes: item.notes ?? null,
    status,
    days_remaining,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
  };
}

// GET /items/summary — must be before /items/:id
router.get("/items/summary", async (req, res): Promise<void> => {
  const items = await db.select().from(itemsTable);
  let active = 0;
  let expiring_soon = 0;
  let expired = 0;
  let expiring_this_week = 0;

  for (const item of items) {
    const { status, days_remaining } = computeStatus(item.expirationDate);
    if (status === "active") active++;
    else if (status === "expiring_soon") expiring_soon++;
    else if (status === "expired") expired++;
    if (days_remaining >= 0 && days_remaining <= 7) expiring_this_week++;
  }

  res.json({
    total: items.length,
    active,
    expiring_soon,
    expired,
    expiring_this_week,
  });
});

// GET /items
router.get("/items", async (req, res): Promise<void> => {
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, sort } = parsed.data;

  let query = db.select().from(itemsTable);

  if (search) {
    query = query.where(
      or(
        ilike(itemsTable.title, `%${search}%`),
        ilike(itemsTable.category, `%${search}%`),
      ),
    ) as typeof query;
  }

  const sortDir = sort === "desc" ? desc : asc;
  query = query.orderBy(sortDir(itemsTable.expirationDate)) as typeof query;

  const rows = await query;

  let enriched = rows.map(enrichItem);

  if (status) {
    enriched = enriched.filter((i) => i.status === status);
  }

  res.json(enriched);
});

// POST /items
router.post("/items", async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid create item body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, category, expiration_date, notes } = parsed.data;

  const [item] = await db
    .insert(itemsTable)
    .values({
      title,
      category: category ?? null,
      expirationDate: expiration_date,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(enrichItem(item));
});

// GET /items/:id
router.get("/items/:id", async (req, res): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(enrichItem(item));
});

// PATCH /items/:id
router.patch("/items/:id", async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid update item body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, category, expiration_date, notes } = parsed.data;

  const updateData: Partial<{
    title: string;
    category: string | null;
    expirationDate: string;
    notes: string | null;
  }> = {};

  if (title !== undefined) updateData.title = title;
  if (category !== undefined) updateData.category = category;
  if (expiration_date !== undefined) updateData.expirationDate = expiration_date;
  if (notes !== undefined) updateData.notes = notes;

  const [item] = await db
    .update(itemsTable)
    .set(updateData)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(enrichItem(item));
});

// DELETE /items/:id
router.delete("/items/:id", async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(itemsTable)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
