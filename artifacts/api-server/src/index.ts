import { app } from "./app";

// Validate required environment variables at startup
const requiredEnvVars = ['DATABASE_URL', 'PORT'];
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const port = process.env.PORT || 5000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
