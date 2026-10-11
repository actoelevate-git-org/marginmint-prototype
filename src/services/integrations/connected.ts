import type { ProviderCode } from "@/integrations/types";
import type { IntegrationProviderId } from "@/lib/env";
import type { IntegrationRepository } from "@/repositories/integration-repository";
import { getCurrentWorkspace } from "@/services/workspace";
import { integrationRepository } from "./context";
import { PROVIDER_CODE, PROVIDER_IDS } from "./registry";

export type ConnectedProvider = { id: IntegrationProviderId; code: ProviderCode; reauthRequired: boolean };

/** Marketplaces with an active (or needs-reconnect) connection. Empty when no database is configured or reachable. */
export async function connectedProviders(
  repo: IntegrationRepository | null = integrationRepository(),
  workspaceId = getCurrentWorkspace().id,
): Promise<ConnectedProvider[]> {
  if (!repo) return [];
  try {
    const connections = await repo.listConnections(workspaceId);
    return PROVIDER_IDS.flatMap((id) => {
      const connection = connections.find((c) => c.provider === PROVIDER_CODE[id]);
      if (!connection || connection.status === "DISCONNECTED") return [];
      return [{ id, code: PROVIDER_CODE[id], reauthRequired: connection.status === "REAUTH_REQUIRED" }];
    });
  } catch {
    return [];
  }
}
