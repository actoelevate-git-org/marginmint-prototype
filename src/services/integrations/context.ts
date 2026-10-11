import type { MarketplaceAdapter } from "@/integrations/types";
import { parseEncryptionKey } from "@/lib/crypto/token-cipher";
import { getPrisma } from "@/lib/db";
import { readEnv, type IntegrationProviderId } from "@/lib/env";
import type { IntegrationRepository } from "@/repositories/integration-repository";
import { PrismaIntegrationRepository } from "@/repositories/prisma-integration-repository";
import { getCurrentWorkspace } from "@/services/workspace";
import { resolveAdapter } from "./registry";

export type IntegrationContext = {
  repo: IntegrationRepository;
  adapter: MarketplaceAdapter;
  encryptionKey: Buffer;
  workspace: { id: string; name: string };
};

export type ContextResult = { ok: true; context: IntegrationContext } | { ok: false; reason: "not_configured" };

/**
 * Server-side wiring for one provider. The workspace comes from the server
 * (`getCurrentWorkspace`), never from the request. When authentication is added,
 * that function must resolve the signed-in member's workspace.
 */
export function integrationContext(provider: IntegrationProviderId): ContextResult {
  const env = readEnv();
  const resolution = resolveAdapter(provider, env);
  const db = getPrisma();
  if (!resolution.configured || !db) return { ok: false, reason: "not_configured" };
  const workspace = getCurrentWorkspace();
  return {
    ok: true,
    context: {
      repo: new PrismaIntegrationRepository(db),
      adapter: resolution.adapter,
      encryptionKey: parseEncryptionKey(env.TOKEN_ENCRYPTION_KEY),
      workspace: { id: workspace.id, name: workspace.name },
    },
  };
}

export function integrationRepository(): IntegrationRepository | null {
  const db = getPrisma();
  return db ? new PrismaIntegrationRepository(db) : null;
}
