import { randomBytes } from "node:crypto";
import { Decimal } from "decimal.js";
import { afterAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/db";
import { PrismaIntegrationRepository } from "./prisma-integration-repository";

/**
 * Runs against a real PostgreSQL database. Opt-in only:
 *   npm run test:db
 * Uses a throwaway workspace that is deleted (cascading) afterwards.
 */
const enabled = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
const workspaceId = `ws_dbtest_${randomBytes(6).toString("hex")}`;

describe.skipIf(!enabled)("PrismaIntegrationRepository (real database)", { timeout: 60_000 }, () => {
  const db = enabled ? getPrisma() : null;
  const repo = db ? new PrismaIntegrationRepository(db) : null;
  const now = new Date();

  afterAll(async () => {
    await db?.workspace.deleteMany({ where: { id: workspaceId } });
    await db?.$disconnect();
  });

  it("creates the workspace and enforces single-use OAuth state", async () => {
    await repo!.ensureWorkspace(workspaceId, "DB test");
    await repo!.ensureWorkspace(workspaceId, "DB test");
    const stateHash = randomBytes(32).toString("hex");
    await repo!.createOAuthState({ workspaceId, provider: "AMAZON", stateHash, expiresAt: new Date(now.getTime() + 600_000) });
    const [a, b] = await Promise.all([
      repo!.consumeOAuthState({ provider: "AMAZON", stateHash, now }),
      repo!.consumeOAuthState({ provider: "AMAZON", stateHash, now }),
    ]);
    expect([a, b].filter(Boolean)).toEqual([{ workspaceId }]);
    expect(await repo!.consumeOAuthState({ provider: "FLIPKART", stateHash, now })).toBeNull();
  });

  it("saves and updates a connection with a JSON cursor", async () => {
    await repo!.saveAuthorizedConnection({
      workspaceId, provider: "AMAZON", externalSellerId: "A1TEST",
      refreshTokenEnc: "v1.x.y.z", accessTokenEnc: "v1.a.b.c",
      accessTokenExpiresAt: new Date(now.getTime() + 3600_000), refreshTokenExpiresAt: null,
    });
    await repo!.updateConnection(workspaceId, "AMAZON", { syncState: { lastUpdatedAfter: now.toISOString() }, lastSyncStatus: "SUCCEEDED" });
    const connection = await repo!.getConnection(workspaceId, "AMAZON");
    expect(connection?.status).toBe("CONNECTED");
    expect(connection?.syncState).toEqual({ lastUpdatedAfter: now.toISOString() });
    await repo!.updateConnection(workspaceId, "AMAZON", { syncState: null });
    expect((await repo!.getConnection(workspaceId, "AMAZON"))?.syncState).toBeNull();
  });

  it("bulk-upserts orders idempotently with exact money and UTC timestamps", async () => {
    const make = (n: number, status: "CONFIRMED" | "SHIPPED") => ({
      externalOrderId: `408-0000000-${String(n).padStart(7, "0")}`,
      orderedAt: new Date(Date.UTC(2026, 9, 10, 18, 45, 30, 123)),
      providerUpdatedAt: n % 2 ? null : new Date("2026-10-11T01:02:03.004Z"),
      status,
      providerStatus: status === "SHIPPED" ? "SHIPPED" : "UNSHIPPED",
      fulfilledBy: "MERCHANT",
      currency: "INR",
      itemValue: new Decimal("2498.10"),
      discount: n % 3 ? null : new Decimal("0.10"),
      units: 2,
      lastSyncedAt: now,
      items: [
        { externalItemId: `${n}-a`, sku: "MM-104", productRef: "B0TEST", title: "Laptop Stand, aluminium 'pro'", quantity: 1, unitPrice: new Decimal("1249.05"), lineValue: new Decimal("1249.05"), discount: null, providerStatus: null },
        { externalItemId: `${n}-b`, sku: "MM-104", productRef: null, title: null, quantity: 1, unitPrice: null, lineValue: new Decimal("1249.05"), discount: null, providerStatus: "X" },
      ],
    });
    const batch = Array.from({ length: 100 }, (_, i) => make(i + 1, "CONFIRMED"));

    const started = performance.now();
    expect(await repo!.saveOrders(workspaceId, "AMAZON", batch)).toEqual({ created: 100, updated: 0 });
    const elapsed = performance.now() - started;
    // A full page must not cost one round trip per order.
    expect(elapsed).toBeLessThan(15_000);

    const changed = batch.map((o) => ({ ...o, status: "SHIPPED" as const, items: o.items.slice(0, 1) }));
    expect(await repo!.saveOrders(workspaceId, "AMAZON", changed)).toEqual({ created: 0, updated: 100 });
    expect(await repo!.countOrders(workspaceId, "AMAZON")).toBe(100);

    const stored = await repo!.getOrder(workspaceId, "AMAZON", "408-0000000-0000002");
    expect(stored?.status).toBe("SHIPPED");
    expect(stored?.items).toHaveLength(1);
    expect(stored?.items[0]?.title).toBe("Laptop Stand, aluminium 'pro'");
    expect(stored?.itemValue?.toFixed(2)).toBe("2498.10");
    expect(stored?.orderedAt.toISOString()).toBe("2026-10-10T18:45:30.123Z");
    expect(stored?.providerUpdatedAt?.toISOString()).toBe("2026-10-11T01:02:03.004Z");
    expect(stored?.discount).toBeNull();

    const batchRead = await repo!.getOrders(workspaceId, "AMAZON", ["408-0000000-0000001", "nope"]);
    expect([...batchRead.keys()]).toEqual(["408-0000000-0000001"]);
    await expect(repo!.saveOrders(workspaceId, "AMAZON", [make(1, "SHIPPED"), make(1, "SHIPPED")])).rejects.toThrow(/Duplicate/);

    const listed = await repo!.listOrders({
      workspaceId, providers: ["AMAZON"], from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-31T00:00:00Z"),
      status: "ALL", q: "408-0000000-000000", sort: { key: "value", dir: "desc" }, page: 1, pageSize: 25,
    });
    expect(listed.total).toBe(9);
    expect(listed.rows).toHaveLength(9);
    expect(listed.statusCounts).toMatchObject({ SHIPPED: 9 });
    console.info(`saved 100 orders in ${Math.round(elapsed)} ms`);
  });

  it("blocks a concurrent sync run", async () => {
    const first = await repo!.tryStartSyncRun({ workspaceId, provider: "AMAZON", now, staleAfterMs: 300_000 });
    expect(first).not.toBeNull();
    expect(await repo!.tryStartSyncRun({ workspaceId, provider: "AMAZON", now, staleAfterMs: 300_000 })).toBeNull();
    await repo!.finishSyncRun(first!, { status: "SUCCEEDED", finishedAt: new Date(), message: null, ordersFetched: 1, ordersCreated: 1, ordersUpdated: 0 });
  });
});
