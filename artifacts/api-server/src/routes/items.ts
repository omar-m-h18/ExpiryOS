/**
 * Items route handlers.
 *
 * These handlers are intentionally thin: validate input → call repository →
 * return response. Business logic lives in `lib/status.ts`; data access lives
 * in `repositories/items.repository.ts`.
 *
 * Route order matters — `/items/summary` MUST be registered before `/items/:id`
 * so Express does not treat the literal string "summary" as a UUID parameter.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  ListItemsQueryParams,
  CreateItemBody,
  GetItemParams,
  UpdateItemParams,
  UpdateItemBody,
  DeleteItemParams,
} from "@workspace/api-zod";
import { itemsRepository } from "../repositories/items.repository";
import { createRateLimiter } from "../middlewares/rate-limit";
import { logger } from "../lib/logger";
import { ITEM_LIMITS, findItemFieldError } from "../lib/validation";
import {
  MAX_ITEMS_PER_OWNER,
  RATE_LIMIT_MAX_ITEM_WRITES,
  RATE_LIMIT_WINDOW_MS,
} from "../config";

const router: IRouter = Router();

/**
 * Cap creation attempts per IP. Rooms are anonymous, so without this a single
 * client could create unbounded rows across unbounded rooms.
 */
const createItemLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_ITEM_WRITES,
  message: "Too many items created. Please slow down.",
});

// GET /items/summary — must precede /items/:id
router.get("/items/summary", async (req: Request, res: Response): Promise<void> => {
  const summary = await itemsRepository.getSummary(req.ownerId);
  res.json(summary);
});

// GET /items
router.get("/items", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    return;
  }

  // The generated schema coerces `search` to a string but sets no upper bound.
  // An unbounded value would run an unindexed `ILIKE '%…%'` scan, so bound it.
  if (parsed.data.search !== undefined && parsed.data.search.length > ITEM_LIMITS.search) {
    res.status(400).json({
      error: `search must be at most ${ITEM_LIMITS.search} characters`,
    });
    return;
  }

  const items = await itemsRepository.findAll(req.ownerId, parsed.data);
  res.json(items);
});

// POST /items
router.post("/items", createItemLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ details: parsed.error.flatten() }, "invalid create-item body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  // The generated schema only requires a non-empty title, so the date format
  // and field lengths are enforced here. Without the date check a value like
  // "banana" reaches the Postgres `date` column and throws, turning a client
  // mistake into a 500.
  const fieldError = findItemFieldError(parsed.data);
  if (fieldError !== null) {
    res.status(400).json({ error: fieldError });
    return;
  }

  // Hard per-room cap: each anonymous room is free storage otherwise. This is
  // a COUNT(*) against the indexed owner_id column. It is a soft cap under
  // exact concurrency (two simultaneous creates can each pass the check), by
  // design — the goal is bounding abuse, not exact accounting.
  const existingCount = await itemsRepository.count(req.ownerId);
  if (existingCount >= MAX_ITEMS_PER_OWNER) {
    res.status(409).json({
      error: `This demo room is limited to ${MAX_ITEMS_PER_OWNER} items. Delete some to add more.`,
    });
    return;
  }

  const item = await itemsRepository.create(req.ownerId, parsed.data);
  res.status(201).json(item);
});

// GET /items/:id
router.get("/items/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const item = await itemsRepository.findById(req.ownerId, params.data.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

// PATCH /items/:id
router.patch("/items/:id", async (req: Request, res: Response): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ details: parsed.error.flatten() }, "invalid update-item body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  // zod strips unknown keys, so an empty parse result means the client sent no
  // updatable field (e.g. `{}` or only unrecognised keys). Without this guard
  // the repository would build an empty SQL SET clause, which Drizzle rejects
  // with "No values to set" — surfacing as a 500 instead of a 400.
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "No updatable fields were provided" });
    return;
  }

  // Same field-shape checks as creation, applied only to the fields present.
  const fieldError = findItemFieldError(parsed.data);
  if (fieldError !== null) {
    res.status(400).json({ error: fieldError });
    return;
  }

  const item = await itemsRepository.update(req.ownerId, params.data.id, parsed.data);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

// DELETE /items/:id
router.delete("/items/:id", async (req: Request, res: Response): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const item = await itemsRepository.delete(req.ownerId, params.data.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
