import type { Decimal } from "decimal.js";
import type { NormalizedItem, NormalizedOrderStatus, ProviderCode } from "@/integrations/types";

/**
 * Persistence contract for marketplace connections and synced orders.
 * Every method is scoped by workspaceId; implementations must never return
 * another workspace's rows. No business formulas live here.
 */
export type ConnectionStatus = "CONNECTED" | "REAUTH_REQUIRED" | "DISCONNECTED";
export type SyncStatus = "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED";

export type ConnectionRecord = {
  workspaceId: string;
  provider: ProviderCode;
  externalSellerId: string | null;
  status: ConnectionStatus;
  refreshTokenEnc: string | null;
  accessTokenEnc: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  syncState: unknown;
  connectedAt: Date;
  lastSyncAt: Date | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncMessage: string | null;
};

export type ConnectionPatch = Partial<
  Pick<
    ConnectionRecord,
    "status" | "accessTokenEnc" | "accessTokenExpiresAt" | "refreshTokenEnc" | "refreshTokenExpiresAt" | "syncState" | "lastSyncAt" | "lastSyncStatus" | "lastSyncMessage"
  >
>;

export type StoredOrder = {
  externalOrderId: string;
  orderedAt: Date;
  providerUpdatedAt: Date | null;
  status: NormalizedOrderStatus;
  providerStatus: string;
  fulfilledBy: string | null;
  currency: string;
  itemValue: Decimal | null;
  discount: Decimal | null;
  units: number;
  lastSyncedAt: Date;
  items: NormalizedItem[];
};

export type SyncedOrderQuery = {
  workspaceId: string;
  providers: ProviderCode[];
  from: Date;
  to: Date;
  status: NormalizedOrderStatus | "ALL";
  q: string;
  sort: { key: "date" | "value" | "units"; dir: "asc" | "desc" };
  page: number;
  pageSize: number;
};

export type SyncRunTotals = { ordersFetched: number; ordersCreated: number; ordersUpdated: number };

export interface IntegrationRepository {
  ensureWorkspace(id: string, name: string): Promise<void>;

  createOAuthState(args: { workspaceId: string; provider: ProviderCode; stateHash: string; expiresAt: Date }): Promise<void>;
  /** Atomically marks a valid, unexpired, unused state as consumed. Returns its workspace or null. */
  consumeOAuthState(args: { provider: ProviderCode; stateHash: string; now: Date }): Promise<{ workspaceId: string } | null>;

  getConnection(workspaceId: string, provider: ProviderCode): Promise<ConnectionRecord | null>;
  listConnections(workspaceId: string): Promise<ConnectionRecord[]>;
  /** Creates or re-authorises a connection; resets the sync cursor. */
  saveAuthorizedConnection(args: {
    workspaceId: string;
    provider: ProviderCode;
    externalSellerId: string | null;
    refreshTokenEnc: string | null;
    accessTokenEnc: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date | null;
  }): Promise<void>;
  updateConnection(workspaceId: string, provider: ProviderCode, patch: ConnectionPatch): Promise<void>;

  getOrder(workspaceId: string, provider: ProviderCode, externalOrderId: string): Promise<StoredOrder | null>;
  /** Existing orders (with items) for a batch of external ids, keyed by external id. */
  getOrders(workspaceId: string, provider: ProviderCode, externalOrderIds: string[]): Promise<Map<string, StoredOrder>>;
  /**
   * Inserts or replaces a batch of orders and their items in one transaction, in a
   * constant number of round trips (sync pages can hold 100 orders). External ids
   * must be unique within the batch.
   */
  saveOrders(workspaceId: string, provider: ProviderCode, orders: StoredOrder[]): Promise<{ created: number; updated: number }>;
  listOrders(query: SyncedOrderQuery): Promise<{ rows: (StoredOrder & { provider: ProviderCode })[]; total: number; statusCounts: Record<string, number> }>;
  countOrders(workspaceId: string, provider: ProviderCode): Promise<number>;

  /** Starts a run unless another run for this connection started within `staleAfterMs`. */
  tryStartSyncRun(args: { workspaceId: string; provider: ProviderCode; now: Date; staleAfterMs: number }): Promise<string | null>;
  finishSyncRun(id: string, args: { status: SyncStatus; finishedAt: Date; message: string | null } & SyncRunTotals): Promise<void>;
}
