import { ProviderError } from "@/integrations/http";
import type { MarketplaceAdapter, NormalizedItem, NormalizedOrder } from "@/integrations/types";
import { decryptToken, encryptToken } from "@/lib/crypto/token-cipher";
import type { ConnectionRecord, IntegrationRepository, StoredOrder } from "@/repositories/integration-repository";

/**
 * Pulls orders from a connected marketplace and upserts them.
 *
 * - Idempotent: orders are keyed by (workspace, provider, external order id) and
 *   items by external item id, so re-running never duplicates.
 * - Batched: each page is read and written in a constant number of queries, so a
 *   100-order page stays fast even over a high-latency database link.
 * - Resumable: the cursor is saved after every page. A run stops at a page/time
 *   budget (serverless functions have short limits) and reports PARTIAL; the next
 *   run continues where it stopped.
 * - Items from a later page are merged into the stored order, so an order whose
 *   items arrive across pages or filter segments (Flipkart) ends up complete.
 */
export type SyncOutcome =
  | { kind: "completed" | "partial"; fetched: number; created: number; updated: number }
  | { kind: "not_connected" | "already_running" | "reauth_required" | "rate_limited" | "failed" };

export type SyncDeps = {
  repo: IntegrationRepository;
  adapter: MarketplaceAdapter;
  encryptionKey: Buffer;
  workspaceId: string;
  now?: () => Date;
  maxPages?: number;
  timeBudgetMs?: number;
};

const ACCESS_TOKEN_SKEW_MS = 5 * 60_000;
const RUN_STALE_AFTER_MS = 5 * 60_000;

async function accessTokenFor(deps: SyncDeps, connection: ConnectionRecord, now: Date): Promise<string> {
  const fresh =
    connection.accessTokenEnc &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() - ACCESS_TOKEN_SKEW_MS > now.getTime();
  if (fresh && connection.accessTokenEnc) return decryptToken(connection.accessTokenEnc, deps.encryptionKey);
  if (!connection.refreshTokenEnc) throw new ProviderError("unauthorized", null, deps.adapter.id);

  const tokens = await deps.adapter.refreshAccessToken(decryptToken(connection.refreshTokenEnc, deps.encryptionKey));
  await deps.repo.updateConnection(deps.workspaceId, deps.adapter.code, {
    accessTokenEnc: encryptToken(tokens.accessToken, deps.encryptionKey),
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    ...(tokens.refreshToken
      ? { refreshTokenEnc: encryptToken(tokens.refreshToken, deps.encryptionKey), refreshTokenExpiresAt: tokens.refreshTokenExpiresAt }
      : {}),
  });
  return tokens.accessToken;
}

function mergeItems(existing: NormalizedItem[], incoming: NormalizedItem[]): NormalizedItem[] {
  const byId = new Map(existing.map((item) => [item.externalItemId, item]));
  for (const item of incoming) byId.set(item.externalItemId, item);
  return [...byId.values()];
}

/** Collapse repeated orders within one page so each external id is saved once. */
function dedupePage(orders: NormalizedOrder[]): NormalizedOrder[] {
  const byId = new Map<string, NormalizedOrder>();
  for (const order of orders) {
    const seen = byId.get(order.externalOrderId);
    byId.set(order.externalOrderId, seen ? { ...order, items: mergeItems(seen.items, order.items) } : order);
  }
  return [...byId.values()];
}

/** Merge a page into stored orders and save it in one batch. */
async function savePage(deps: SyncDeps, pageOrders: NormalizedOrder[], now: Date): Promise<{ created: number; updated: number }> {
  const orders = dedupePage(pageOrders);
  if (orders.length === 0) return { created: 0, updated: 0 };
  const existing = await deps.repo.getOrders(deps.workspaceId, deps.adapter.code, orders.map((o) => o.externalOrderId));
  const toSave = orders.map((order): StoredOrder => {
    const previous = existing.get(order.externalOrderId);
    const items = mergeItems(previous?.items ?? [], order.items);
    const summary = deps.adapter.summarize(order, items);
    return {
      externalOrderId: order.externalOrderId,
      orderedAt: order.orderedAt,
      providerUpdatedAt: order.providerUpdatedAt ?? previous?.providerUpdatedAt ?? null,
      status: summary.status,
      providerStatus: summary.providerStatus,
      fulfilledBy: order.fulfilledBy ?? previous?.fulfilledBy ?? null,
      currency: order.currency,
      itemValue: summary.itemValue,
      discount: summary.discount,
      units: summary.units,
      lastSyncedAt: now,
      items,
    };
  });
  return deps.repo.saveOrders(deps.workspaceId, deps.adapter.code, toSave);
}

const SAFE_MESSAGE: Record<string, string> = {
  completed: "Sync complete.",
  partial: "More orders remain. Run sync again to continue.",
  reauth_required: "The marketplace rejected our access. Reconnect the account.",
  rate_limited: "The marketplace rate limit was reached. Try again in a few minutes.",
  failed: "The marketplace request failed. No orders were lost; try again.",
};

export async function syncOrders(deps: SyncDeps): Promise<SyncOutcome> {
  const clock = deps.now ?? (() => new Date());
  const startedAt = clock();
  const connection = await deps.repo.getConnection(deps.workspaceId, deps.adapter.code);
  if (!connection || connection.status === "DISCONNECTED") return { kind: "not_connected" };
  if (connection.status === "REAUTH_REQUIRED") return { kind: "reauth_required" };

  const runId = await deps.repo.tryStartSyncRun({
    workspaceId: deps.workspaceId,
    provider: deps.adapter.code,
    now: startedAt,
    staleAfterMs: RUN_STALE_AFTER_MS,
  });
  if (!runId) return { kind: "already_running" };

  const totals = { ordersFetched: 0, ordersCreated: 0, ordersUpdated: 0 };
  const maxPages = deps.maxPages ?? 8;
  const budget = deps.timeBudgetMs ?? 8_000;
  let cursor = deps.adapter.parseCursor(connection.syncState);
  let outcome: SyncOutcome["kind"] = "completed";

  try {
    const accessToken = await accessTokenFor(deps, connection, startedAt);
    for (let page = 0; ; page += 1) {
      if (page >= maxPages || clock().getTime() - startedAt.getTime() > budget) {
        outcome = "partial";
        break;
      }
      const result = await deps.adapter.fetchOrdersPage({ accessToken, cursor, now: startedAt });
      const saved = await savePage(deps, result.orders, clock());
      totals.ordersFetched += saved.created + saved.updated;
      totals.ordersCreated += saved.created;
      totals.ordersUpdated += saved.updated;
      cursor = result.next ?? result.resumeFrom;
      await deps.repo.updateConnection(deps.workspaceId, deps.adapter.code, { syncState: cursor });
      if (!result.next) break;
    }
  } catch (error) {
    if (!(error instanceof ProviderError)) {
      await deps.repo.finishSyncRun(runId, { status: "FAILED", finishedAt: clock(), message: SAFE_MESSAGE.failed ?? null, ...totals });
      throw error;
    }
    outcome = error.kind === "unauthorized" || error.kind === "forbidden" ? "reauth_required" : error.kind === "rate_limited" ? "rate_limited" : "failed";
  }

  const status = outcome === "completed" ? "SUCCEEDED" : outcome === "partial" ? "PARTIAL" : "FAILED";
  const message = SAFE_MESSAGE[outcome] ?? null;
  await deps.repo.finishSyncRun(runId, { status, finishedAt: clock(), message, ...totals });
  await deps.repo.updateConnection(deps.workspaceId, deps.adapter.code, {
    lastSyncAt: clock(),
    lastSyncStatus: status,
    lastSyncMessage: message,
    ...(outcome === "reauth_required" ? { status: "REAUTH_REQUIRED" as const } : {}),
  });

  if (outcome === "completed" || outcome === "partial") {
    return { kind: outcome, fetched: totals.ordersFetched, created: totals.ordersCreated, updated: totals.ordersUpdated };
  }
  return { kind: outcome };
}
