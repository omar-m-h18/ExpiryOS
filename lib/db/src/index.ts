import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString?.includes("sslmode=require")
    ? connectionString
    : `${connectionString}?sslmode=require`,
});

export const db = drizzle(pool);
