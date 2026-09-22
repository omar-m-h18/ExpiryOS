import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

/**
 * Shared health handler, exported separately from the router so the same check
 * can be mounted at more than one path (see `app.ts`).
 */
export function healthCheck(_req: Request, res: Response): void {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

const router: IRouter = Router();

router.get("/healthz", healthCheck);

export default router;