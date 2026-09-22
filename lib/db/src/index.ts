import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveSslConfig } from "./ssl";

const connectionString = process.env.DATABASE_URL;

// Fail fast at startup instead of creating a broken pool that fails every
// request with an opaque connection error. This is what makes "create item"
// and "email list" both surface as vague 500s when the DB is misconfigured.
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Configure it in the environment (e.g. Render) " +
      "with your Neon PostgreSQL connection string.",
  );
}

const pool = new Pool({
  connectionString,
  // TLS verification is ON by default for remote hosts. Set
  // DATABASE_SSL_REJECT_UNAUTHORIZED=false only if your provider presents a
  // chain Node cannot verify. See ./ssl.ts.
  ssl: resolveSslConfig(connectionString, process.env.DATABASE_SSL_REJECT_UNAUTHORIZED),
  // Give the pool sane timeouts so a dead/unreachable DB doesn't make every
  // request hang and read as "slow" — fail the query fast with a real error.
  connectionTimeoutMillis: 10_000,
  query_timeout: 15_000,
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool);

/**
 * Close the connection pool.
 *
 * Called during graceful shutdown so a deploy/restart does not leak
 * connections or leave the pool's sockets dangling.
 */
export async function closeDb(): Promise<void> {
  await pool.end();
}

export * from "./schema";

