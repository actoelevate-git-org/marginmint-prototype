import { randomBytes } from "node:crypto";
import { Decimal } from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/integrations/http";
import type { MarketplaceAdapter, NormalizedItem, NormalizedOrder, OrdersPage, TokenSet } from "@/integrations/types";
import { FlipkartAdapter } from "@/integrations/flipkart/adapter";
import { decryptToken, encryptToken, sha256 } from "@/lib/crypto/token-cipher";
import { resolveDateRange } from "@/lib/dates";
import { readEnv } from "@/lib/env";
import { MemoryIntegrationRepository } from "@/repositories/memory-integration-repository";
import { completeAuthorization, disconnect, startAuthorization } from "./oauth";
import { getMarketplaceIntegrations } from "./status";
import { syncOrders } from "./sync";
import { listSyncedOrders } from "./synced-orders";

const key = randomBytes(32);
const workspace = { id: "ws_test", name: "Test" };
const T0 = new Date("2026-10-11T08:40:00Z");

type Cursor = { page: number };

function order(id: string, items: Partial<NormalizedItem>[], extra: Partial<NormalizedOrder> = {}): NormalizedOrder {
  return {
    externalOrderId: id,
    orderedAt: new Date("2026-10-10T06:00:00Z"),
    providerUpdatedAt: null,
    status: "CONFIRMED",
    providerStatus: "UNSHIPPED",
    fulfilledBy: "MERCHANT",
    currency: "INR",
    items: items.map((i, n) => ({
      externalItemId: `${id}-${n}`,
      sku: "MM-101",
      productRef: null,
      title: null,
      quantity: 1,
      unitPrice: new Decimal("100.00"),
      lineValue: new Decimal("100.00"),
      discount: new Decimal(0),
      providerStatus: null,
      ...i,
    })),
    ...extra,
  };
}

/** Scriptable adapter: pages are served in order; tokens are fixed strings. */
function fakeAdapter(pages: (OrdersPage<Cursor> | Error)[], overrides: Partial<MarketplaceAdapter<Cursor>> = {}): MarketplaceAdapter<Cursor> & {
  fetchOrdersPage: ReturnType<typeof vi.fn>;
  refreshAccessToken: ReturnType<typeof vi.fn>;
} {
  const tokens = (access: string): TokenSet => ({
    accessToken: access,
    accessTokenExpiresAt: new Date(T0.getTime() + 3600_000),
    refreshToken: "refresh-1",
    refreshTokenExpiresAt: null,
  });
  return {
    id: "amazon",
    code: "AMAZON",
    displayName: "Amazon",
    authorizationUrl: (state: string) => `https://consent.test/?state=${state}`,
    parseCallback: (p: URLSearchParams) => {
      const state = p.get("state");
      const code = p.get("code");
      if (!state) return { ok: false, reason: "invalid_request", state: null };
      if (!code) return { ok: false, reason: "denied", state };
      return { ok: true, code, state, externalSellerId: "A1SELLER" };
    },
    exchangeCode: vi.fn(async () => tokens("access-1")),
    refreshAccessToken: vi.fn(async () => tokens("access-2")),
    parseCursor: (raw: unknown) => (raw && typeof raw === "object" && "page" in raw ? (raw as Cursor) : null),
    fetchOrdersPage: vi.fn(async ({ cursor }: { cursor: Cursor | null }) => {
      const page = pages[cursor?.page ?? 0];
      if (!page) throw new Error("no page scripted");
      if (page instanceof Error) throw page;
      return page;
    }),
    summarize: (o: Pick<NormalizedOrder, "status" | "providerStatus">, items: NormalizedItem[]) => ({
      status: o.status ?? "PENDING",
      providerStatus: o.providerStatus ?? "?",
      units: items.reduce((n, i) => n + i.quantity, 0),
      itemValue: items.reduce((sum: Decimal, i) => sum.add(i.lineValue ?? 0), new Decimal(0)),
      discount: new Decimal(0),
    }),
    ...overrides,
  } as never;
}

async function connect(repo: MemoryIntegrationRepository, adapter: MarketplaceAdapter, now = T0) {
  const { state } = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => now });
  return completeAuthorization({
    repo, adapter, encryptionKey: key, workspace, now: () => now,
    params: new URLSearchParams({ state, code: "the-code" }),
    stateCookie: state,
  });
}

describe("OAuth connect flow", () => {
  let repo: MemoryIntegrationRepository;
  beforeEach(() => {
    repo = new MemoryIntegrationRepository();
  });

  it("stores only a hash of the state, then saves encrypted tokens", async () => {
    const adapter = fakeAdapter([]);
    const { state, redirectUrl } = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0 });
    expect(redirectUrl).toContain(state);
    expect(repo.states[0]?.stateHash).toBe(sha256(state));
    expect(JSON.stringify(repo.states)).not.toContain(state);

    const outcome = await completeAuthorization({
      repo, adapter, encryptionKey: key, workspace, now: () => T0,
      params: new URLSearchParams({ state, code: "the-code" }), stateCookie: state,
    });
    expect(outcome).toBe("connected");
    const connection = await repo.getConnection(workspace.id, "AMAZON");
    expect(connection?.status).toBe("CONNECTED");
    expect(connection?.externalSellerId).toBe("A1SELLER");
    expect(JSON.stringify(connection)).not.toContain("refresh-1");
    expect(decryptToken(connection?.refreshTokenEnc ?? "", key)).toBe("refresh-1");
  });

  it("rejects a callback from a different browser (cookie mismatch)", async () => {
    const adapter = fakeAdapter([]);
    const { state } = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0 });
    const outcome = await completeAuthorization({
      repo, adapter, encryptionKey: key, workspace, now: () => T0,
      params: new URLSearchParams({ state, code: "c" }), stateCookie: "someone-elses-state",
    });
    expect(outcome).toBe("state_mismatch");
    expect(await repo.getConnection(workspace.id, "AMAZON")).toBeNull();
  });

  it("is single-use and expires after 10 minutes", async () => {
    const adapter = fakeAdapter([]);
    const { state } = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0 });
    const args = { repo, adapter, encryptionKey: key, workspace, params: new URLSearchParams({ state, code: "c" }), stateCookie: state };
    expect(await completeAuthorization({ ...args, now: () => T0 })).toBe("connected");
    expect(await completeAuthorization({ ...args, now: () => T0 })).toBe("state_expired");

    const late = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0 });
    expect(
      await completeAuthorization({ ...args, params: new URLSearchParams({ state: late.state, code: "c" }), stateCookie: late.state, now: () => new Date(T0.getTime() + 11 * 60_000) }),
    ).toBe("state_expired");
  });

  it("consumes the state when the seller declines", async () => {
    const adapter = fakeAdapter([]);
    const { state } = await startAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0 });
    const outcome = await completeAuthorization({ repo, adapter, encryptionKey: key, workspace, now: () => T0, params: new URLSearchParams({ state }), stateCookie: state });
    expect(outcome).toBe("denied");
    expect(repo.states[0]?.consumedAt).not.toBeNull();
  });

  it("reports token exchange failures without saving anything", async () => {
    const adapter = fakeAdapter([], { exchangeCode: vi.fn(async () => { throw new ProviderError("bad_request", 400, "amazon"); }) });
    expect(await connect(repo, adapter)).toBe("token_exchange_failed");
    expect(await repo.getConnection(workspace.id, "AMAZON")).toBeNull();
  });

  it("disconnect deletes tokens but keeps synced orders", async () => {
    const adapter = fakeAdapter([{ orders: [order("O1", [{}])], next: null, resumeFrom: null }]);
    await connect(repo, adapter);
    await syncOrders({ repo, adapter, encryptionKey: key, workspaceId: workspace.id, now: () => T0 });
    await disconnect({ repo, adapter, workspace });
    const connection = await repo.getConnection(workspace.id, "AMAZON");
    expect(connection?.status).toBe("DISCONNECTED");
    expect(connection?.refreshTokenEnc).toBeNull();
    expect(connection?.accessTokenEnc).toBeNull();
    expect(await repo.countOrders(workspace.id, "AMAZON")).toBe(1);
  });
});

describe("order sync", () => {
  let repo: MemoryIntegrationRepository;
  beforeEach(() => {
    repo = new MemoryIntegrationRepository();
  });
  const deps = (adapter: MarketplaceAdapter, extra: Record<string, unknown> = {}) => ({ repo, adapter, encryptionKey: key, workspaceId: workspace.id, now: () => T0, ...extra });

  it("refuses to run before a connection exists", async () => {
    expect((await syncOrders(deps(fakeAdapter([])))).kind).toBe("not_connected");
  });

  it("stops at the page budget, saves the cursor, and resumes on the next run", async () => {
    const adapter = fakeAdapter([
      { orders: [order("O1", [{}])], next: { page: 1 }, resumeFrom: null },
      { orders: [order("O2", [{}])], next: { page: 2 }, resumeFrom: null },
      { orders: [order("O3", [{}])], next: null, resumeFrom: { page: 0 } },
    ]);
    await connect(repo, adapter);
    const first = await syncOrders(deps(adapter, { maxPages: 2 }));
    expect(first).toEqual({ kind: "partial", fetched: 2, created: 2, updated: 0 });
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.syncState).toEqual({ page: 2 });
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.lastSyncStatus).toBe("PARTIAL");

    const second = await syncOrders(deps(adapter, { maxPages: 2 }));
    expect(second).toEqual({ kind: "completed", fetched: 1, created: 1, updated: 0 });
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.syncState).toEqual({ page: 0 });
  });

  it("is idempotent: re-syncing the same orders updates instead of duplicating", async () => {
    const adapter = fakeAdapter([{ orders: [order("O1", [{}, {}])], next: null, resumeFrom: null }]);
    await connect(repo, adapter);
    await syncOrders(deps(adapter));
    const again = await syncOrders(deps(adapter));
    expect(again).toEqual({ kind: "completed", fetched: 1, created: 0, updated: 1 });
    expect(await repo.countOrders(workspace.id, "AMAZON")).toBe(1);
    expect((await repo.getOrder(workspace.id, "AMAZON", "O1"))?.items).toHaveLength(2);
  });

  it("merges duplicate orders within one page instead of failing the batch", async () => {
    const adapter = fakeAdapter([
      { orders: [order("O1", [{ externalItemId: "A" }]), order("O1", [{ externalItemId: "B" }])], next: null, resumeFrom: null },
    ]);
    await connect(repo, adapter);
    expect(await syncOrders(deps(adapter))).toEqual({ kind: "completed", fetched: 1, created: 1, updated: 0 });
    expect((await repo.getOrder(workspace.id, "AMAZON", "O1"))?.items.map((i) => i.externalItemId).sort()).toEqual(["A", "B"]);
  });

  it("merges items that arrive on different pages into one order", async () => {
    const adapter = fakeAdapter([
      { orders: [order("O1", [{ externalItemId: "A", quantity: 2, lineValue: new Decimal("200.00") }])], next: { page: 1 }, resumeFrom: null },
      { orders: [order("O1", [{ externalItemId: "B", quantity: 1, lineValue: new Decimal("50.50") }])], next: null, resumeFrom: null },
    ]);
    await connect(repo, adapter);
    await syncOrders(deps(adapter));
    const stored = await repo.getOrder(workspace.id, "AMAZON", "O1");
    expect(stored?.items.map((i) => i.externalItemId).sort()).toEqual(["A", "B"]);
    expect(stored?.units).toBe(3);
    expect(stored?.itemValue?.toFixed(2)).toBe("250.50");
  });

  it("refreshes an expired access token and stores the new one encrypted", async () => {
    const adapter = fakeAdapter([{ orders: [], next: null, resumeFrom: null }]);
    await connect(repo, adapter);
    const later = new Date(T0.getTime() + 2 * 3600_000);
    await syncOrders(deps(adapter, { now: () => later }));
    expect(adapter.refreshAccessToken).toHaveBeenCalledWith("refresh-1");
    expect(adapter.fetchOrdersPage.mock.calls[0]?.[0].accessToken).toBe("access-2");
    const connection = await repo.getConnection(workspace.id, "AMAZON");
    expect(decryptToken(connection?.accessTokenEnc ?? "", key)).toBe("access-2");
  });

  it("marks the connection for reauthorisation when the marketplace rejects our token", async () => {
    const adapter = fakeAdapter([new ProviderError("unauthorized", 401, "amazon")]);
    await connect(repo, adapter);
    expect((await syncOrders(deps(adapter))).kind).toBe("reauth_required");
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.status).toBe("REAUTH_REQUIRED");
    expect((await syncOrders(deps(adapter))).kind).toBe("reauth_required");
    expect(repo.runs.at(-1)?.status).toBe("FAILED");
  });

  it("keeps progress when rate-limited mid-run", async () => {
    const adapter = fakeAdapter([
      { orders: [order("O1", [{}])], next: { page: 1 }, resumeFrom: null },
      new ProviderError("rate_limited", 429, "amazon"),
    ]);
    await connect(repo, adapter);
    expect((await syncOrders(deps(adapter))).kind).toBe("rate_limited");
    expect(await repo.countOrders(workspace.id, "AMAZON")).toBe(1);
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.syncState).toEqual({ page: 1 });
    expect((await repo.getConnection(workspace.id, "AMAZON"))?.status).toBe("CONNECTED");
  });

  it("does not run two syncs for the same connection at once", async () => {
    const adapter = fakeAdapter([{ orders: [], next: null, resumeFrom: null }]);
    await connect(repo, adapter);
    await repo.tryStartSyncRun({ workspaceId: workspace.id, provider: "AMAZON", now: T0, staleAfterMs: 300_000 });
    expect((await syncOrders(deps(adapter))).kind).toBe("already_running");
  });

  it("works end-to-end with the real Flipkart adapter: grouped items and derived status", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ hasMore: false, shipments: [] }), { status: 200 }),
    );
    fetchImpl.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          hasMore: false,
          shipments: [
            { orderItems: [{ orderItemId: "1", orderId: "OD1", status: "READY_TO_DISPATCH", orderDate: "2026-10-10T10:00:00", sku: "MM-103", quantity: 1, priceComponents: { sellingPrice: 599 } }] },
          ],
        }),
        { status: 200 },
      ),
    );
    const adapter = new FlipkartAdapter({ clientId: "c", clientSecret: "s", redirectUri: "https://app.test/cb" }, fetchImpl, async () => {});
    await repo.saveAuthorizedConnection({
      workspaceId: workspace.id, provider: "FLIPKART", externalSellerId: null,
      refreshTokenEnc: encryptToken("r", key), accessTokenEnc: encryptToken("a", key),
      accessTokenExpiresAt: new Date(T0.getTime() + 86_400_000), refreshTokenExpiresAt: null,
    });
    const outcome = await syncOrders({ repo, adapter: adapter as MarketplaceAdapter, encryptionKey: key, workspaceId: workspace.id, now: () => T0 });
    expect(outcome).toEqual({ kind: "completed", fetched: 1, created: 1, updated: 0 });
    const stored = await repo.getOrder(workspace.id, "FLIPKART", "OD1");
    expect(stored?.status).toBe("CONFIRMED");
    expect(stored?.providerStatus).toBe("READY_TO_DISPATCH");
    expect(stored?.itemValue?.toFixed(2)).toBe("599.00");
  });
});

describe("synced orders listing", () => {
  it("filters by provider and IST date range, and shows unpriced orders as unknown", async () => {
    const repo = new MemoryIntegrationRepository();
    const base = { providerUpdatedAt: null, status: "CONFIRMED" as const, providerStatus: "UNSHIPPED", fulfilledBy: null, currency: "INR", discount: null, units: 1, lastSyncedAt: T0, items: [] };
    // 2026-10-10T19:00Z is 11 Oct 00:30 IST — inside "today" only in IST.
    await repo.saveOrders(workspace.id, "AMAZON", [{ ...base, externalOrderId: "A-today", orderedAt: new Date("2026-10-10T19:00:00Z"), itemValue: null }]);
    await repo.saveOrders(workspace.id, "FLIPKART", [{ ...base, externalOrderId: "F-today", orderedAt: new Date("2026-10-11T05:00:00Z"), itemValue: new Decimal("1234.50") }]);
    await repo.saveOrders("other_ws", "AMAZON", [{ ...base, externalOrderId: "OTHER", orderedAt: new Date("2026-10-11T05:00:00Z"), itemValue: null }]);

    const range = resolveDateRange({ preset: "today", today: "2026-10-11" });
    const args = { range, status: "ALL" as const, q: "", sort: { key: "date" as const, dir: "desc" as const }, page: 1 };
    const all = await listSyncedOrders({ ...args, marketplace: "ALL" }, repo, workspace.id);
    expect(all.kind === "ok" && all.page.rows.map((r) => r.id)).toEqual(["F-today", "A-today"]);
    if (all.kind === "ok") {
      expect(all.page.rows[0]?.value).toBe("₹1,234.50");
      expect(all.page.rows[1]?.value).toBe("—");
      expect(all.page.rows[1]?.valueNote).toMatch(/Not priced/);
    }
    const amazon = await listSyncedOrders({ ...args, marketplace: "AMAZON" }, repo, workspace.id);
    expect(amazon.kind === "ok" && amazon.page.total).toBe(1);
    const shopify = await listSyncedOrders({ ...args, marketplace: "SHOPIFY" }, repo, workspace.id);
    expect(shopify.kind === "ok" && shopify.providers).toEqual([]);
    expect((await listSyncedOrders({ ...args, marketplace: "ALL" }, null, workspace.id)).kind).toBe("unavailable");
  });
});

describe("integration status", () => {
  it("reports missing configuration by variable name only", async () => {
    const original = { ...process.env };
    for (const k of Object.keys(readEnv())) delete process.env[k];
    try {
      const integrations = await getMarketplaceIntegrations(new MemoryIntegrationRepository(), workspace.id);
      const amazon = integrations.find((i) => i.id === "amazon");
      expect(amazon?.state.kind).toBe("not_configured");
      if (amazon?.state.kind === "not_configured") expect(amazon.state.missing).toContain("AMAZON_LWA_CLIENT_SECRET");
    } finally {
      process.env = original;
    }
  });

  it("shows connected only for a stored, authorised connection", async () => {
    const original = { ...process.env };
    Object.assign(process.env, {
      DATABASE_URL: "postgres://x", APP_URL: "https://app.test", TOKEN_ENCRYPTION_KEY: key.toString("base64"),
      AMAZON_SPAPI_APP_ID: "a", AMAZON_LWA_CLIENT_ID: "b", AMAZON_LWA_CLIENT_SECRET: "c",
      FLIPKART_CLIENT_ID: "d", FLIPKART_CLIENT_SECRET: "e",
    });
    try {
      const repo = new MemoryIntegrationRepository();
      await connect(repo, fakeAdapter([]));
      const [amazon, flipkart] = await getMarketplaceIntegrations(repo, workspace.id);
      expect(amazon?.state.kind).toBe("connected");
      expect(flipkart?.state.kind).toBe("not_connected");
    } finally {
      process.env = original;
    }
  });
});
