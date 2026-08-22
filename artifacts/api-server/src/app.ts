import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import requireSession from "./middlewares/requireSession";
import router from "./routes";

const app = express();

app.use(helmet());

// require an explicit, allow-listed frontend origin in production.
// The dev proxy on localhost is handled by Vite proxying to this server,
// so FRONTEND_URL is only needed for cross-origin / deployed setups.
const allowedOrigin = process.env.FRONTEND_URL;
if (allowedOrigin) {
  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
  }));
} else {
  // Dev fallback: reflect the request origin (credentials included) so the
  // Vite dev proxy and local tooling keep working. Tightened in production.
  app.use(cors({
    origin: true,
    credentials: true,
  }));
}

app.use(express.json());

// Parse cookies so `req.cookies` is available (must precede requireSession).
app.use(cookieParser());

// Guarantee every request has an ephemeral visitor session ("room").
app.use(requireSession);

// FIX #1: Mount everything under /api so it matches the frontend calls
app.use("/api", router);

export { app };
