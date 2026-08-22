/**
 * Leads route — early-bird waitlist signup.
 *
 * Keep it thin and dependency-free: a minimal email check inline, then delegate
 * to the leads repository. (The OpenAPI/codegen step may later supersede this
 * with generated validation, but we avoid a direct `zod` import here since the
 * api-server package doesn't declare it.)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createLead } from "../repositories/leads.repository";

const router: IRouter = Router();

// Simple, pragmatic email check — good enough for a waitlist entry.
function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// POST /api/leads
router.post("/leads", async (req: Request, res: Response): Promise<void> => {
  const email = (req.body as { email?: unknown })?.email;
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please provide a valid email address" });
    return;
  }

  const lead = await createLead(email);
  res.status(201).json({
    id: lead.id,
    email: lead.email,
    created_at: lead.createdAt.toISOString(),
  });
});

export default router;
