/**
 * Structured application logger.
 *
 * Built on [Pino](https://getpino.io/) for high-performance structured logging.
 *
 * ## Behaviour by environment
 * - **Development** (`NODE_ENV !== "production"`): pretty-printed, colorized
 *   output via `pino-pretty` — easy to read in a terminal.
 * - **Production**: newline-delimited JSON (NDJSON) suitable for log
 *   aggregators such as Datadog, Loki, or AWS CloudWatch.
 *
 * ## Sensitive data
 * The `redact` list ensures that `Authorization`, `Cookie`, and `Set-Cookie`
 * headers are never written to logs, even at debug level.
 *
 * ## Log level
 * Controlled via the `LOG_LEVEL` environment variable (default: `"info"`).
 * Valid levels in ascending severity: `trace | debug | info | warn | error | fatal`.
 *
 * @module lib/logger
 */

import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
