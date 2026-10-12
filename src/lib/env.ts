import { z } from "zod";

/**
 * Server-only configuration. Values are read lazily and validated with Zod so a
 * missing integration credential degrades that integration to "Not configured"
 * instead of crashing the app. Never import this module from client components.
 */

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  DATABASE_URL: optional,
  APP_URL: optional,
  TOKEN_ENCRYPTION_KEY: optional,
  AMAZON_SPAPI_APP_ID: optional,
  AMAZON_LWA_CLIENT_ID: optional,
  AMAZON_LWA_CLIENT_SECRET: optional,
  AMAZON_SPAPI_DRAFT_APP: optional,
  FLIPKART_CLIENT_ID: optional,
  FLIPKART_CLIENT_SECRET: optional,
  FLIPKART_API_HOST: optional,
});

export type ServerEnv = z.infer<typeof schema>;

export function readEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return schema.parse(source);
}

export type IntegrationProviderId = "amazon" | "flipkart";

/** Which required variables are missing, by name only (never values). */
export function missingConfig(provider: IntegrationProviderId, env: ServerEnv = readEnv()): string[] {
  const shared: (keyof ServerEnv)[] = ["DATABASE_URL", "APP_URL", "TOKEN_ENCRYPTION_KEY"];
  const specific: (keyof ServerEnv)[] =
    provider === "amazon"
      ? ["AMAZON_SPAPI_APP_ID", "AMAZON_LWA_CLIENT_ID", "AMAZON_LWA_CLIENT_SECRET"]
      : ["FLIPKART_CLIENT_ID", "FLIPKART_CLIENT_SECRET"];
  return [...shared, ...specific].filter((key) => !env[key]);
}

export function isDatabaseConfigured(env: ServerEnv = readEnv()): boolean {
  return Boolean(env.DATABASE_URL);
}

/** Absolute redirect URI registered with the provider. */
export function callbackUrl(provider: IntegrationProviderId, env: ServerEnv = readEnv()): string {
  if (!env.APP_URL) throw new Error("APP_URL is not configured");
  return new URL(`/api/integrations/${provider}/callback`, env.APP_URL).toString();
}
