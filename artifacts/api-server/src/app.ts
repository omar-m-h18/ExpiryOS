import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json());

export { app };
