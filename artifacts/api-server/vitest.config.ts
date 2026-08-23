import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Repository/DB tests need a real PostgreSQL (DATABASE_URL). They are
    // tagged with `.integration.test.ts` and only run when an env flag is set,
    // keeping local + CI runs green without a DB.
    testTimeout: 20_000,
  },
});
