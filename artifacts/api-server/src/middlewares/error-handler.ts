import type { Request, Response, NextFunction } from "express";

/** Central error handler — logs the real error, returns a clean 500. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[error]", err instanceof Error ? err.stack : err);
  res.status(500).json({ error: "Internal server error" });
}
