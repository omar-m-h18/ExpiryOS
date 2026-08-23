import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import requireSession from "./middlewares/requireSession";
import { errorHandler } from "./middlewares/error-handler";
import router from "./routes";

const app = express();

app.use(helmet());

// CORS is only relevant when the frontend and API are on *different* origins.
// In production we require an explicit allow-list. The Netlify `_redirects`
// proxy forwards same-origin `/api/*` to Render, so in that topology CORS is
// not even triggered — this guard is a safety net against a permissive API.
const isProd = process.env.NODE_ENV === "production";
const allowedOrigin = process.env.FRONTEND_URL;

if (isProd) {
  if (!allowedOrigin) {
    // Do NOT start a production API that accepts arbitrary origins.
    throw new Error(
      "FRONTEND_URL must be set in production. Set it to the frontend origin " +
        "(e.g. https://expiryos.netlify.app).",
    );
  }
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    }),
  );
} else {
  // Dev fallback: reflect the request origin so the Vite dev proxy / local
  // tooling keep working. Never used in production (see guard above).
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
}

app.use(express.json());

// Parse cookies so `req.cookies` is available (must precede requireSession).
app.use(cookieParser());

// Guarantee every request has an ephemeral visitor session ("room").
app.use(requireSession);

// FIX #1: Mount everything under /api so it matches the frontend calls
app.use("/api", router);

// Central error handler — MUST be mounted after all routes. Logs the real
// error server-side (Render logs) and returns a clean 500 JSON to the client.
app.use(errorHandler);

export { app };

