import express from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";

const app = express();

app.use(helmet());

const allowedOrigin = process.env.FRONTEND_URL;
if (allowedOrigin) {
  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));
} else {
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

app.use(express.json());

// FIX #1: Mount everything under /api so it matches the frontend calls
app.use("/api", router);

export { app };
