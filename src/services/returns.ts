import { demoDataset } from "@/data/demo/seed";
import { MARKETPLACES, type DemoDataset } from "@/data/demo/types";
import { returnRate } from "@/domain/finance";
import { formatInr, formatPercent, Money } from "@/domain/money";
import { formatDayLong } from "@/lib/dates";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { paginate, type Page } from "@/lib/pagination";
import type { GlobalFilters } from "@/lib/search-params";
import { getLedger, scopedReturns, unitStatsFor } from "./ledger";
import { orderHref } from "./orders";

export type ReturnRow = {
  id: string;
  orderId: string;
  orderHref: string;
  marketplace: string;
  sku: string;
  product: string;
  quantity: number;
  date: string;
  reason: string;
  refund: string;
  returnShipping: string;
  recovered: boolean;
  loss: string;
};

export function getReturnsView(args: { filters: GlobalFilters; q: string; page: number }, dataset: DemoDataset = demoDataset) {
  const ledger = getLedger(dataset);
  const scope = { range: args.filters.range, marketplace: args.filters.marketplace };
  const products = new Map(dataset.products.map((p) => [p.id, p]));
  const q = args.q.toLowerCase();
  const facts = scopedReturns(ledger, scope);
  const units = unitStatsFor(ledger, scope);
  const sum = (pick: (f: (typeof facts)[number]) => Money) => facts.reduce((s, f) => s.add(pick(f)), Money.zero());

  const reasons = new Map<string, number>();
  for (const f of facts) reasons.set(f.reason, (reasons.get(f.reason) ?? 0) + f.units);
  const returnedUnits = units.returnedUnits;

  const byProduct = dataset.products
    .map((p) => {
      const s = unitStatsFor(ledger, { ...scope, productId: p.id });
      return { sku: p.sku, name: p.name, returned: s.returnedUnits, sold: s.soldUnits, rate: s.returnRate };
    })
    .filter((r) => r.returned > 0)
    .sort((a, b) => b.returned - a.returned || a.sku.localeCompare(b.sku))
    .slice(0, 5);

  const filtered = facts.filter((f) => {
    const sku = products.get(f.productId)?.sku.toLowerCase() ?? "";
    return !q || sku.includes(q) || f.orderId.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
  });
  const page: Page<ReturnRow> = paginate(
    [...filtered].sort((a, b) => b.day.localeCompare(a.day) || b.id.localeCompare(a.id)).map((f) => ({
      id: f.id,
      orderId: f.orderId,
      orderHref: orderHref(f.orderId),
      marketplace: MARKETPLACE_LABEL[f.marketplace],
      sku: products.get(f.productId)?.sku ?? f.productId,
      product: products.get(f.productId)?.name ?? "Unknown product",
      quantity: f.units,
      date: formatDayLong(f.day),
      reason: f.reason,
      refund: formatInr(f.refund),
      returnShipping: formatInr(f.returnShipping),
      recovered: !f.recoveredCost.isZero(),
      loss: formatInr(f.loss),
    })),
    args.page,
  );

  return {
    summary: {
      returnRate: formatPercent(units.returnRate),
      returnedUnits,
      soldUnits: units.soldUnits,
      refundValue: formatInr(sum((f) => f.refund), { decimals: 0 }),
      estimatedLoss: formatInr(sum((f) => f.loss), { decimals: 0 }),
      recoveredCost: formatInr(sum((f) => f.recoveredCost), { decimals: 0 }),
      returnCount: facts.length,
    },
    reasons: [...reasons.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([reason, count]) => ({
        reason,
        units: count,
        share: returnedUnits > 0 ? formatPercent(returnRate({ returnedUnits: count, soldUnits: returnedUnits }), 0) : "—",
        sharePct: returnedUnits > 0 ? Math.round((count / returnedUnits) * 100) : 0,
      })),
    byMarketplace: MARKETPLACES.map((m) => {
      const s = unitStatsFor(ledger, { range: args.filters.range, marketplace: m });
      return { label: MARKETPLACE_LABEL[m], rate: formatPercent(s.returnRate), returned: s.returnedUnits, sold: s.soldUnits };
    }),
    topProducts: byProduct.map((r) => ({ ...r, rate: formatPercent(r.rate) })),
    page,
  };
}
