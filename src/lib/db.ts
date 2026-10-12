import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { readEnv } from "./env";

/**
 * Lazily-created Prisma client (pg driver adapter). Reused across hot reloads and
 * warm serverless invocations. Returns null when DATABASE_URL is not configured,
 * so callers can show a setup state instead of crashing.
 */
type Client = InstanceType<typeof PrismaClient>;
const globalForPrisma = globalThis as unknown as { marginmintPrisma?: Client };

export function getPrisma(): Client | null {
  const url = readEnv().DATABASE_URL;
  if (!url) return null;
  if (!globalForPrisma.marginmintPrisma) {
    globalForPrisma.marginmintPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 3 }) });
  }
  return globalForPrisma.marginmintPrisma;
}
