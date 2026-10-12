import { Decimal } from "decimal.js";
import type { NormalizedOrderStatus, ProviderCode } from "@/integrations/types";
import { formatInr, Money } from "@/domain/money";
import { formatDayLong, dayKeyOf, formatInstantIst, type DateRange } from "@/lib/dates";
import type { MarketplaceFilter } from "@/lib/marketplaces";
import { DEFAULT_PAGE_SIZE, type Page } from "@/lib/pagination";
import type { SortDirection } from "@/lib/search-params";
import type { IntegrationRepository } from "@/repositories/integration-repository";
import { getCurrentWorkspace } from "@/services/workspace";
import { integrationRepository } from "./context";

export const SYNCED_PROVIDER_LABEL: Record<ProviderCode, string> = { AMAZON: "Amazon India", FLIPKART: "Flipkart" };

export type SyncedOrderRow = {
  id: string;
  provider: ProviderCode;
  marketplace: string;
  date: string;
  items: number;
  units: number;
  value: string;
  valueNote: string | null;
  status: NormalizedOrderStatus;
  providerStatus: string;
  fulfilledBy: string | null;
  lastSynced: string;
};

export type SyncedOrdersResult =
  | { kind: "unavailable"; reason: "no_database" | "query_failed" }
  | { kind: "ok"; page: Page<SyncedOrderRow>; statusCounts: Record<string, number>; providers: ProviderCode[] };

/** INR is the only reporting currency today; other currencies are shown without conversion. */
function formatValue(value: Decimal | null, currency: string): { text: string; note: string | null } {
  if (value === null) return { text: "—", note: "Not priced yet by the marketplace" };
  if (currency !== "INR") return { text: `${currency} ${value.toFixed(2)}`, note: "Not converted to INR" };
  return { text: formatInr(Money.fromMajor(value)), note: null };
}

export async function listSyncedOrders(
  args: {
    range: DateRange;
    marketplace: MarketplaceFilter;
    status: NormalizedOrderStatus | "ALL";
    q: string;
    sort: { key: "date" | "value" | "units"; dir: SortDirection };
    page: number;
  },
  repo: IntegrationRepository | null = integrationRepository(),
  workspaceId = getCurrentWorkspace().id,
): Promise<SyncedOrdersResult> {
  if (!repo) return { kind: "unavailable", reason: "no_database" };
  const providers: ProviderCode[] =
    args.marketplace === "ALL" ? ["AMAZON", "FLIPKART"] : args.marketplace === "AMAZON" || args.marketplace === "FLIPKART" ? [args.marketplace] : [];
  // Day keys are IST calendar days; convert to instant bounds.
  const from = new Date(`${args.range.startDay}T00:00:00.000+05:30`);
  const to = new Date(`${args.range.endDay}T23:59:59.999+05:30`);
  try {
    const query = { workspaceId, providers, from, to, status: args.status, q: args.q, sort: args.sort, pageSize: DEFAULT_PAGE_SIZE };
    let result = await repo.listOrders({ ...query, page: args.page });
    const pageCount = Math.max(1, Math.ceil(result.total / DEFAULT_PAGE_SIZE));
    const page = Math.min(args.page, pageCount);
    // A page past the end (stale link) shows the last real page instead of an empty table.
    if (page !== args.page) result = await repo.listOrders({ ...query, page });
    const start = (page - 1) * DEFAULT_PAGE_SIZE;
    return {
      kind: "ok",
      providers,
      statusCounts: result.statusCounts,
      page: {
        page,
        pageCount,
        total: result.total,
        from: result.rows.length ? start + 1 : 0,
        to: start + result.rows.length,
        rows: result.rows.map((order) => {
          const value = formatValue(order.itemValue, order.currency);
          return {
            id: order.externalOrderId,
            provider: order.provider,
            marketplace: SYNCED_PROVIDER_LABEL[order.provider],
            date: formatDayLong(dayKeyOf(order.orderedAt.toISOString())),
            items: order.items.length,
            units: order.units,
            value: value.text,
            valueNote: value.note,
            status: order.status,
            providerStatus: order.providerStatus,
            fulfilledBy: order.fulfilledBy,
            lastSynced: formatInstantIst(order.lastSyncedAt.toISOString()),
          };
        }),
      },
    };
  } catch {
    return { kind: "unavailable", reason: "query_failed" };
  }
}
