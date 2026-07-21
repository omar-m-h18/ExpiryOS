import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          // Strip query string from logged URL to avoid leaking sensitive params
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api", router);

// ---------------------------------------------------------------------------
// Global error handler
//
// Must be defined with four parameters so Express recognises it as an error
// handler rather than a regular middleware. Catches any error thrown (or
// passed via `next(err)`) by route handlers and returns a consistent JSON
// error envelope so clients always receive a parseable response body.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number })?.statusCode ??
    500;

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  logger.error({ err, statusCode }, "Unhandled request error");

  res.status(statusCode).json({ error: message });
});

export default app;
