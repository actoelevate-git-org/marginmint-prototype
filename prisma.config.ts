import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7's CLI does not load env files. Next.js loads .env.local for the app;
// mirror that for CLI commands locally. Deployed builds use real env vars.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

/**
 * Prisma CLI config. Migrations use the direct (non-pooled) Neon connection when
 * provided; the app runtime uses DATABASE_URL (pooled) via the pg driver adapter.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
