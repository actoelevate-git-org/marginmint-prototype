import type { ProviderCode } from "@/integrations/types";
import type {
  ConnectionPatch,
  ConnectionRecord,
  IntegrationRepository,
  StoredOrder,
  SyncedOrderQuery,
  SyncRunTotals,
  SyncStatus,
} from "./integration-repository";

function toStored(row: StoredOrder): StoredOrder {
  return {
    externalOrderId: row.externalOrderId,
    orderedAt: row.orderedAt,
    providerUpdatedAt: row.providerUpdatedAt,
    status: row.status,
    providerStatus: row.providerStatus,
    fulfilledBy: row.fulfilledBy,
    currency: row.currency,
    itemValue: row.itemValue,
    discount: row.discount,
    units: row.units,
    lastSyncedAt: row.lastSyncedAt,
    items: [...row.items],
  };
}

/** In-memory implementation for tests and local development without a database. */
export class MemoryIntegrationRepository implements IntegrationRepository {
  workspaces = new Map<string, string>();
  states: { workspaceId: string; provider: ProviderCode; stateHash: string; expiresAt: Date; consumedAt: Date | null }[] = [];
  connections: ConnectionRecord[] = [];
  orders = new Map<string, StoredOrder & { provider: ProviderCode; workspaceId: string }>();
  runs: ({ id: string; workspaceId: string; provider: ProviderCode; status: SyncStatus; startedAt: Date; finishedAt: Date | null; message: string | null } & SyncRunTotals)[] = [];

  private key(workspaceId: string, provider: ProviderCode, externalOrderId: string) {
    return `${workspaceId}|${provider}|${externalOrderId}`;
  }

  async ensureWorkspace(id: string, name: string) {
    if (!this.workspaces.has(id)) this.workspaces.set(id, name);
  }

  async createOAuthState(args: { workspaceId: string; provider: ProviderCode; stateHash: string; expiresAt: Date }) {
    this.states.push({ ...args, consumedAt: null });
  }

  async consumeOAuthState(args: { provider: ProviderCode; stateHash: string; now: Date }) {
    const row = this.states.find((s) => s.stateHash === args.stateHash);
    if (!row || row.provider !== args.provider || row.consumedAt || row.expiresAt <= args.now) return null;
    row.consumedAt = args.now;
    return { workspaceId: row.workspaceId };
  }

  async getConnection(workspaceId: string, provider: ProviderCode) {
    return this.connections.find((c) => c.workspaceId === workspaceId && c.provider === provider) ?? null;
  }

  async listConnections(workspaceId: string) {
    return this.connections.filter((c) => c.workspaceId === workspaceId);
  }

  async saveAuthorizedConnection(args: Parameters<IntegrationRepository["saveAuthorizedConnection"]>[0]) {
    const existing = await this.getConnection(args.workspaceId, args.provider);
    const next: ConnectionRecord = {
      workspaceId: args.workspaceId,
      provider: args.provider,
      externalSellerId: args.externalSellerId,
      status: "CONNECTED",
      refreshTokenEnc: args.refreshTokenEnc,
      accessTokenEnc: args.accessTokenEnc,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      syncState: null,
      connectedAt: existing?.connectedAt ?? new Date(),
      lastSyncAt: existing?.lastSyncAt ?? null,
      lastSyncStatus: existing?.lastSyncStatus ?? null,
      lastSyncMessage: null,
    };
    this.connections = [...this.connections.filter((c) => c !== existing), next];
  }

  async updateConnection(workspaceId: string, provider: ProviderCode, patch: ConnectionPatch) {
    const existing = await this.getConnection(workspaceId, provider);
    if (existing) Object.assign(existing, patch);
  }

  async getOrder(workspaceId: string, provider: ProviderCode, externalOrderId: string) {
    const row = this.orders.get(this.key(workspaceId, provider, externalOrderId));
    return row ? toStored(row) : null;
  }

  async getOrders(workspaceId: string, provider: ProviderCode, externalOrderIds: string[]) {
    const found = new Map<string, StoredOrder>();
    for (const id of externalOrderIds) {
      const row = this.orders.get(this.key(workspaceId, provider, id));
      if (row) found.set(id, toStored(row));
    }
    return found;
  }

  async saveOrders(workspaceId: string, provider: ProviderCode, orders: StoredOrder[]) {
    if (new Set(orders.map((o) => o.externalOrderId)).size !== orders.length) throw new Error("Duplicate external order ids in batch");
    let created = 0;
    for (const order of orders) {
      const key = this.key(workspaceId, provider, order.externalOrderId);
      if (!this.orders.has(key)) created += 1;
      this.orders.set(key, { ...order, items: [...order.items], provider, workspaceId });
    }
    return { created, updated: orders.length - created };
  }

  async listOrders(query: SyncedOrderQuery) {
    const q = query.q.toLowerCase();
    const scoped = [...this.orders.values()].filter(
      (o) =>
        o.workspaceId === query.workspaceId &&
        query.providers.includes(o.provider) &&
        o.orderedAt >= query.from &&
        o.orderedAt <= query.to &&
        (!q || o.externalOrderId.toLowerCase().includes(q) || o.items.some((i) => i.sku?.toLowerCase() === q)),
    );
    const statusCounts: Record<string, number> = { ALL: scoped.length };
    for (const o of scoped) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    const filtered = scoped.filter((o) => query.status === "ALL" || o.status === query.status);
    const dir = query.sort.dir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (query.sort.key === "units") return (a.units - b.units) * dir;
      if (query.sort.key === "value") {
        if (!a.itemValue) return 1;
        if (!b.itemValue) return -1;
        return a.itemValue.cmp(b.itemValue) * dir;
      }
      return (a.orderedAt.getTime() - b.orderedAt.getTime()) * dir;
    });
    const start = (query.page - 1) * query.pageSize;
    return {
      rows: filtered.slice(start, start + query.pageSize).map((row) => ({ ...toStored(row), provider: row.provider })),
      total: filtered.length,
      statusCounts,
    };
  }

  async countOrders(workspaceId: string, provider: ProviderCode) {
    return [...this.orders.values()].filter((o) => o.workspaceId === workspaceId && o.provider === provider).length;
  }

  async tryStartSyncRun(args: { workspaceId: string; provider: ProviderCode; now: Date; staleAfterMs: number }) {
    const active = this.runs.find(
      (r) =>
        r.workspaceId === args.workspaceId &&
        r.provider === args.provider &&
        r.status === "RUNNING" &&
        args.now.getTime() - r.startedAt.getTime() < args.staleAfterMs,
    );
    if (active) return null;
    const id = `run_${this.runs.length + 1}`;
    this.runs.push({ id, workspaceId: args.workspaceId, provider: args.provider, status: "RUNNING", startedAt: args.now, finishedAt: null, message: null, ordersFetched: 0, ordersCreated: 0, ordersUpdated: 0 });
    return id;
  }

  async finishSyncRun(id: string, args: { status: SyncStatus; finishedAt: Date; message: string | null } & SyncRunTotals) {
    const run = this.runs.find((r) => r.id === id);
    if (run) Object.assign(run, args);
  }
}
