import { randomUUID } from "node:crypto";
import { Decimal } from "decimal.js";
import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { NormalizedItem, NormalizedOrderStatus, ProviderCode } from "@/integrations/types";
import type {
  ConnectionPatch,
  ConnectionRecord,
  IntegrationRepository,
  StoredOrder,
  SyncedOrderQuery,
  SyncRunTotals,
  SyncStatus,
} from "./integration-repository";

type Client = InstanceType<typeof PrismaClient>;

const fromDb = (value: { toString(): string } | null) => (value === null ? null : new Decimal(value.toString()));

/** Prisma/PostgreSQL implementation. Every query filters by workspaceId. */
export class PrismaIntegrationRepository implements IntegrationRepository {
  constructor(private readonly db: Client) {}

  async ensureWorkspace(id: string, name: string) {
    await this.db.workspace.upsert({ where: { id }, create: { id, name }, update: {} });
  }

  async createOAuthState(args: { workspaceId: string; provider: ProviderCode; stateHash: string; expiresAt: Date }) {
    await this.db.$transaction([
      // Housekeeping: drop expired states so the table stays small.
      this.db.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } }),
      this.db.oAuthState.create({ data: args }),
    ]);
  }

  async consumeOAuthState(args: { provider: ProviderCode; stateHash: string; now: Date }) {
    // Conditional update is atomic: only one request can flip consumedAt from null.
    const { count } = await this.db.oAuthState.updateMany({
      where: { stateHash: args.stateHash, provider: args.provider, consumedAt: null, expiresAt: { gt: args.now } },
      data: { consumedAt: args.now },
    });
    if (count !== 1) return null;
    const row = await this.db.oAuthState.findUnique({ where: { stateHash: args.stateHash }, select: { workspaceId: true } });
    return row ? { workspaceId: row.workspaceId } : null;
  }

  private mapConnection(row: Awaited<ReturnType<Client["marketplaceConnection"]["findFirst"]>> & object): ConnectionRecord {
    return {
      workspaceId: row.workspaceId,
      provider: row.provider,
      externalSellerId: row.externalSellerId,
      status: row.status,
      refreshTokenEnc: row.refreshTokenEnc,
      accessTokenEnc: row.accessTokenEnc,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt,
      syncState: row.syncState,
      connectedAt: row.connectedAt,
      lastSyncAt: row.lastSyncAt,
      lastSyncStatus: row.lastSyncStatus,
      lastSyncMessage: row.lastSyncMessage,
    };
  }

  async getConnection(workspaceId: string, provider: ProviderCode) {
    const row = await this.db.marketplaceConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider } } });
    return row ? this.mapConnection(row) : null;
  }

  async listConnections(workspaceId: string) {
    const rows = await this.db.marketplaceConnection.findMany({ where: { workspaceId } });
    return rows.map((row) => this.mapConnection(row));
  }

  async saveAuthorizedConnection(args: Parameters<IntegrationRepository["saveAuthorizedConnection"]>[0]) {
    const data = {
      externalSellerId: args.externalSellerId,
      status: "CONNECTED" as const,
      refreshTokenEnc: args.refreshTokenEnc,
      accessTokenEnc: args.accessTokenEnc,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      syncState: Prisma.DbNull,
      lastSyncMessage: null,
    };
    await this.db.marketplaceConnection.upsert({
      where: { workspaceId_provider: { workspaceId: args.workspaceId, provider: args.provider } },
      create: { workspaceId: args.workspaceId, provider: args.provider, ...data },
      update: data,
    });
  }

  async updateConnection(workspaceId: string, provider: ProviderCode, patch: ConnectionPatch) {
    const { syncState, ...rest } = patch;
    await this.db.marketplaceConnection.update({
      where: { workspaceId_provider: { workspaceId, provider } },
      data: {
        ...rest,
        ...(syncState === undefined ? {} : { syncState: syncState === null ? Prisma.DbNull : (syncState as Prisma.InputJsonValue) }),
      },
    });
  }

  private mapOrder(row: Prisma.ExternalOrderGetPayload<{ include: { items: true } }>): StoredOrder {
    return {
      externalOrderId: row.externalOrderId,
      orderedAt: row.orderedAt,
      providerUpdatedAt: row.providerUpdatedAt,
      status: row.status as NormalizedOrderStatus,
      providerStatus: row.providerStatus,
      fulfilledBy: row.fulfilledBy,
      currency: row.currency,
      itemValue: fromDb(row.itemValue),
      discount: fromDb(row.discount),
      units: row.units,
      lastSyncedAt: row.lastSyncedAt,
      items: row.items.map(
        (item): NormalizedItem => ({
          externalItemId: item.externalItemId,
          sku: item.sku,
          productRef: item.productRef,
          title: item.title,
          quantity: item.quantity,
          unitPrice: fromDb(item.unitPrice),
          lineValue: fromDb(item.lineValue),
          discount: null,
          providerStatus: item.providerStatus,
        }),
      ),
    };
  }

  async getOrder(workspaceId: string, provider: ProviderCode, externalOrderId: string) {
    const row = await this.db.externalOrder.findUnique({
      where: { workspaceId_provider_externalOrderId: { workspaceId, provider, externalOrderId } },
      include: { items: true },
    });
    return row ? this.mapOrder(row) : null;
  }

  async getOrders(workspaceId: string, provider: ProviderCode, externalOrderIds: string[]) {
    if (externalOrderIds.length === 0) return new Map<string, StoredOrder>();
    const rows = await this.db.externalOrder.findMany({
      where: { workspaceId, provider, externalOrderId: { in: externalOrderIds } },
      include: { items: true },
    });
    return new Map(rows.map((row) => [row.externalOrderId, this.mapOrder(row)]));
  }

  /**
   * Bulk upsert in four statements regardless of batch size: upsert orders,
   * delete their items, insert items. Fully parameterised via Prisma.sql.
   * Timestamps are sent as explicit UTC because the columns are TIMESTAMP
   * without time zone and the pg driver would otherwise use the server's local zone.
   */
  async saveOrders(workspaceId: string, provider: ProviderCode, orders: StoredOrder[]) {
    if (orders.length === 0) return { created: 0, updated: 0 };
    if (new Set(orders.map((o) => o.externalOrderId)).size !== orders.length) {
      throw new Error("Duplicate external order ids in batch");
    }
    const utc = (date: Date | null) => Prisma.sql`(${date ? date.toISOString() : null}::timestamptz AT TIME ZONE 'UTC')`;
    const dec = (value: Decimal | null) => Prisma.sql`${value === null ? null : value.toFixed(2)}::numeric`;

    return this.db.$transaction(
      async (tx) => {
        const orderRows = orders.map(
          (o) => Prisma.sql`(${randomUUID()}, ${workspaceId}, ${provider}::"MarketplaceProvider", ${o.externalOrderId}, ${utc(o.orderedAt)},
            ${utc(o.providerUpdatedAt)}, ${o.status}::"OrderStatus", ${o.providerStatus}, ${o.fulfilledBy}, ${o.currency},
            ${dec(o.itemValue)}, ${dec(o.discount)}, ${o.units}, ${utc(o.lastSyncedAt)}, ${utc(o.lastSyncedAt)})`,
        );
        const saved = await tx.$queryRaw<{ id: string; externalOrderId: string; inserted: boolean }[]>(Prisma.sql`
          INSERT INTO "ExternalOrder" ("id", "workspaceId", "provider", "externalOrderId", "orderedAt", "providerUpdatedAt", "status",
            "providerStatus", "fulfilledBy", "currency", "itemValue", "discount", "units", "lastSyncedAt", "firstSyncedAt")
          VALUES ${Prisma.join(orderRows)}
          ON CONFLICT ("workspaceId", "provider", "externalOrderId") DO UPDATE SET
            "orderedAt" = EXCLUDED."orderedAt",
            "providerUpdatedAt" = EXCLUDED."providerUpdatedAt",
            "status" = EXCLUDED."status",
            "providerStatus" = EXCLUDED."providerStatus",
            "fulfilledBy" = EXCLUDED."fulfilledBy",
            "currency" = EXCLUDED."currency",
            "itemValue" = EXCLUDED."itemValue",
            "discount" = EXCLUDED."discount",
            "units" = EXCLUDED."units",
            "lastSyncedAt" = EXCLUDED."lastSyncedAt"
          RETURNING "id", "externalOrderId", (xmax = 0) AS "inserted"`);

        const idByExternal = new Map(saved.map((row) => [row.externalOrderId, row.id]));
        const orderIds = [...idByExternal.values()];
        await tx.$executeRaw(Prisma.sql`DELETE FROM "ExternalOrderItem" WHERE "orderId" IN (${Prisma.join(orderIds)})`);

        const itemRows = orders.flatMap((o) =>
          o.items.map(
            (item) => Prisma.sql`(${randomUUID()}, ${idByExternal.get(o.externalOrderId)}, ${item.externalItemId}, ${item.sku}, ${item.productRef},
              ${item.title}, ${item.quantity}, ${dec(item.unitPrice)}, ${dec(item.lineValue)}, ${item.providerStatus})`,
          ),
        );
        // Stay well under PostgreSQL's 65,535 bind-parameter limit.
        for (let i = 0; i < itemRows.length; i += 1000) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "ExternalOrderItem" ("id", "orderId", "externalItemId", "sku", "productRef", "title", "quantity", "unitPrice", "lineValue", "providerStatus")
            VALUES ${Prisma.join(itemRows.slice(i, i + 1000))}`);
        }
        const created = saved.filter((row) => row.inserted).length;
        return { created, updated: saved.length - created };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async listOrders(query: SyncedOrderQuery) {
    const base: Prisma.ExternalOrderWhereInput = {
      workspaceId: query.workspaceId,
      provider: { in: query.providers },
      orderedAt: { gte: query.from, lte: query.to },
      ...(query.q
        ? {
            OR: [
              { externalOrderId: { contains: query.q, mode: "insensitive" } },
              { items: { some: { sku: { equals: query.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const where: Prisma.ExternalOrderWhereInput = query.status === "ALL" ? base : { ...base, status: query.status };
    const orderBy: Prisma.ExternalOrderOrderByWithRelationInput =
      query.sort.key === "value"
        ? { itemValue: { sort: query.sort.dir, nulls: "last" } }
        : query.sort.key === "units"
          ? { units: query.sort.dir }
          : { orderedAt: query.sort.dir };
    const [rows, total, grouped] = await this.db.$transaction([
      this.db.externalOrder.findMany({
        where,
        orderBy: [orderBy, { externalOrderId: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { items: true },
      }),
      this.db.externalOrder.count({ where }),
      this.db.externalOrder.groupBy({ by: ["status"], where: base, orderBy: { status: "asc" }, _count: { _all: true } }),
    ]);
    const statusCounts: Record<string, number> = { ALL: 0 };
    for (const g of grouped) {
      const count = typeof g._count === "object" && g._count ? (g._count._all ?? 0) : 0;
      statusCounts[g.status] = count;
      statusCounts.ALL = (statusCounts.ALL ?? 0) + count;
    }
    return { rows: rows.map((row) => ({ ...this.mapOrder(row), provider: row.provider })), total, statusCounts };
  }

  async countOrders(workspaceId: string, provider: ProviderCode) {
    return this.db.externalOrder.count({ where: { workspaceId, provider } });
  }

  async tryStartSyncRun(args: { workspaceId: string; provider: ProviderCode; now: Date; staleAfterMs: number }) {
    return this.db.$transaction(async (tx) => {
      const active = await tx.syncRun.findFirst({
        where: {
          workspaceId: args.workspaceId,
          provider: args.provider,
          status: "RUNNING",
          startedAt: { gt: new Date(args.now.getTime() - args.staleAfterMs) },
        },
        select: { id: true },
      });
      if (active) return null;
      const run = await tx.syncRun.create({
        data: { workspaceId: args.workspaceId, provider: args.provider, status: "RUNNING", startedAt: args.now },
      });
      return run.id;
    });
  }

  async finishSyncRun(id: string, args: { status: SyncStatus; finishedAt: Date; message: string | null } & SyncRunTotals) {
    await this.db.syncRun.update({ where: { id }, data: args });
  }
}
