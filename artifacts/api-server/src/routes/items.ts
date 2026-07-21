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

const router: IRouter = Router();

// GET /items/summary — must precede /items/:id
router.get("/items/summary", async (_req: Request, res: Response): Promise<void> => {
  const summary = await itemsRepository.getSummary();
  res.json(summary);
});

// GET /items
router.get("/items", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    return;
  }

  const items = await itemsRepository.findAll(parsed.data);
  res.json(items);
});

// POST /items
router.post("/items", async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid create-item body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const item = await itemsRepository.create(parsed.data);
  res.status(201).json(item);
});

// GET /items/:id
router.get("/items/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const item = await itemsRepository.findById(params.data.id);
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
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid update-item body");
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const item = await itemsRepository.update(params.data.id, parsed.data);
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

  const item = await itemsRepository.delete(params.data.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
