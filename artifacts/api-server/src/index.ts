import type { Server } from "node:http";
import { closeDb } from "@workspace/db";
import { app } from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT ?? 5000);

const server: Server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "server listening");
});

// Fail loudly rather than dying silently if the port is taken or unbindable.
server.on("error", (err: unknown) => {
  logger.fatal({ err, port }, "server failed to start");
  process.exit(1);
});

/** How long to wait for in-flight requests before exiting anyway. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

/**
 * Stop accepting connections, let in-flight requests drain, then close the
 * database pool.
 *
 * Render sends `SIGTERM` on every deploy and restart; without this the process
 * is killed mid-request and its pooled database connections are dropped
 * abruptly.
 */
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({ signal }, "shutting down");

  // Never hang forever waiting for a stuck connection.
  const forceExit = setTimeout(() => {
    logger.warn({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "shutdown timed out; exiting");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((closeError?: Error) => {
    if (closeError) {
      logger.error({ err: closeError }, "error while closing the server");
      process.exit(1);
    }

    void closeDb()
      .catch((err: unknown) => {
        logger.error({ err }, "error while closing the database pool");
      })
      .finally(() => {
        clearTimeout(forceExit);
        logger.info("shutdown complete");
        process.exit(0);
      });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));