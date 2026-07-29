import express from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";

const app = express();

app.use(helmet());

// CORS configuration for production
// FRONTEND_URL should be set to the Netlify deployment URL in production
// For multiple frontend URLs, use an array: origin: [process.env.FRONTEND_URL]
const allowedOrigin = process.env.FRONTEND_URL;
if (allowedOrigin) {
  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));
} else {
  // In development, allow all origins
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

app.use(express.json());

app.use(router);

export { app };
