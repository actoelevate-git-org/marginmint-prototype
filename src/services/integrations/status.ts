import type { ProviderCode } from "@/integrations/types";
import { formatInstantIst } from "@/lib/dates";
import { isDatabaseConfigured, missingConfig, readEnv, type IntegrationProviderId } from "@/lib/env";
import type { ConnectionRecord, IntegrationRepository } from "@/repositories/integration-repository";
import { getCurrentWorkspace } from "@/services/workspace";
import { integrationRepository } from "./context";
import { PROVIDER_CODE, PROVIDER_IDS } from "./registry";

export type MarketplaceIntegrationState =
  | { kind: "not_configured"; missing: string[] }
  | { kind: "unavailable" }
  | { kind: "not_connected" }
  | { kind: "disconnected"; ordersSynced: number }
  | {
      kind: "connected" | "reauth_required";
      sellerId: string | null;
      connectedAt: string;
      lastSync: string;
      lastSyncStatus: string | null;
      lastSyncMessage: string | null;
      ordersSynced: number;
    };

export type MarketplaceIntegration = { id: IntegrationProviderId; code: ProviderCode; state: MarketplaceIntegrationState };

function describe(connection: ConnectionRecord, ordersSynced: number): MarketplaceIntegrationState {
  if (connection.status === "DISCONNECTED") return { kind: "disconnected", ordersSynced };
  return {
    kind: connection.status === "REAUTH_REQUIRED" ? "reauth_required" : "connected",
    sellerId: connection.externalSellerId,
    connectedAt: formatInstantIst(connection.connectedAt.toISOString()),
    lastSync: connection.lastSyncAt ? formatInstantIst(connection.lastSyncAt.toISOString()) : "Not synced yet",
    lastSyncStatus: connection.lastSyncStatus,
    lastSyncMessage: connection.lastSyncMessage,
    ordersSynced,
  };
}

/** Honest connection status per marketplace. Never reports "connected" without stored, authorised tokens. */
export async function getMarketplaceIntegrations(
  repo: IntegrationRepository | null = integrationRepository(),
  workspaceId = getCurrentWorkspace().id,
): Promise<MarketplaceIntegration[]> {
  const env = readEnv();
  let connections: ConnectionRecord[] = [];
  let reachable = true;
  if (repo && isDatabaseConfigured(env)) {
    try {
      connections = await repo.listConnections(workspaceId);
    } catch {
      reachable = false;
    }
  }
  return Promise.all(
    PROVIDER_IDS.map(async (id) => {
      const code = PROVIDER_CODE[id];
      const missing = missingConfig(id, env);
      if (missing.length > 0) return { id, code, state: { kind: "not_configured" as const, missing } };
      if (!repo || !reachable) return { id, code, state: { kind: "unavailable" as const } };
      const connection = connections.find((c) => c.provider === code);
      if (!connection) return { id, code, state: { kind: "not_connected" as const } };
      return { id, code, state: describe(connection, await repo.countOrders(workspaceId, code)) };
    }),
  );
}
