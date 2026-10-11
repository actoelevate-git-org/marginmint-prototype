import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { acos, roas } from "@/domain/finance";
import { formatInr, formatPercent, Money } from "@/domain/money";
import { isDayInRange } from "@/lib/dates";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { compareNullable } from "@/lib/pagination";
import type { GlobalFilters, SortDirection } from "@/lib/search-params";
import type { Decimal } from "decimal.js";

export const AD_SORT_KEYS = ["spend", "sales", "roas", "acos"] as const;
export type AdSortKey = (typeof AD_SORT_KEYS)[number];

type Agg = { spend: Money; attributed: Money; orders: number; clicks: number; impressions: number };
const emptyAgg = (): Agg => ({ spend: Money.zero(), attributed: Money.zero(), orders: 0, clicks: 0, impressions: 0 });

function metrics(a: Agg) {
  const r = roas({ attributedSales: a.attributed, spend: a.spend });
  const c = acos({ spend: a.spend, attributedSales: a.attributed });
  return { roas: r, acos: c };
}

function formatRoas(value: Decimal | null): string {
  return value === null ? "—" : `${value.toDecimalPlaces(2).toFixed(2)}×`;
}

export type CampaignAggregate = Agg & { marketplace: string; sku: string; campaign: string; roas: Decimal | null; acos: Decimal | null };

/** Campaign-level totals for the filtered period. Raw values; callers format. */
export function aggregateCampaigns(filters: GlobalFilters, dataset: DemoDataset = demoDataset) {
  const products = new Map(dataset.products.map((p) => [p.id, p]));
  const rows = dataset.advertising.filter(
    (row) => isDayInRange(row.date, filters.range) && (filters.marketplace === "ALL" || row.marketplace === filters.marketplace),
  );
  const total = emptyAgg();
  const campaigns = new Map<string, Agg & { marketplace: string; sku: string; campaign: string }>();
  for (const row of rows) {
    const key = `${row.marketplace}|${row.campaign}`;
    const agg = campaigns.get(key) ?? {
      ...emptyAgg(),
      marketplace: MARKETPLACE_LABEL[row.marketplace],
      sku: row.productId ? (products.get(row.productId)?.sku ?? "—") : "—",
      campaign: row.campaign,
    };
    for (const target of [agg, total]) {
      target.spend = target.spend.add(Money.fromMinor(row.spendPaise));
      target.attributed = target.attributed.add(Money.fromMinor(row.attributedSalesPaise));
      target.orders += row.attributedOrders;
      target.clicks += row.clicks;
      target.impressions += row.impressions;
    }
    campaigns.set(key, agg);
  }
  return {
    campaigns: [...campaigns.values()].map((c): CampaignAggregate => ({ ...c, ...metrics(c) })),
    total: { ...total, ...metrics(total) },
  };
}

export function getAdvertisingView(
  args: { filters: GlobalFilters; q: string; sort: { key: AdSortKey; dir: SortDirection } },
  dataset: DemoDataset = demoDataset,
) {
  const q = args.q.toLowerCase();
  const { campaigns, total } = aggregateCampaigns(args.filters, dataset);
  const list = campaigns.filter((c) => !q || c.campaign.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q));
  const { key, dir } = args.sort;
  list.sort((a, b) => {
    switch (key) {
      case "sales":
        return compareNullable(a.attributed, b.attributed, (x, y) => x.cmp(y), dir);
      case "roas":
        return compareNullable(a.roas, b.roas, (x, y) => x.cmp(y), dir);
      case "acos":
        return compareNullable(a.acos, b.acos, (x, y) => x.cmp(y), dir);
      case "spend":
      default:
        return compareNullable(a.spend, b.spend, (x, y) => x.cmp(y), dir);
    }
  });

  return {
    summary: {
      spend: formatInr(total.spend, { decimals: 0 }),
      attributedSales: formatInr(total.attributed, { decimals: 0 }),
      roas: formatRoas(total.roas),
      acos: formatPercent(total.acos),
      clicks: total.clicks.toLocaleString("en-IN"),
      orders: total.orders.toLocaleString("en-IN"),
    },
    rows: list.map((c) => ({
      id: `${c.marketplace}|${c.campaign}`,
      campaign: c.campaign,
      marketplace: c.marketplace,
      sku: c.sku,
      spend: formatInr(c.spend, { decimals: 0 }),
      attributedSales: formatInr(c.attributed, { decimals: 0 }),
      orders: c.orders,
      clicks: c.clicks.toLocaleString("en-IN"),
      impressions: c.impressions.toLocaleString("en-IN"),
      roas: formatRoas(c.roas),
      acos: formatPercent(c.acos),
      unprofitable: c.roas !== null && c.roas.lt(1),
    })),
  };
}
