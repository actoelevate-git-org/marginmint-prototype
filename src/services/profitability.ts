import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { formatInr, formatPercent, Money } from "@/domain/money";
import { Decimal } from "decimal.js";
import { compareNullable } from "@/lib/pagination";
import type { GlobalFilters } from "@/lib/search-params";
import { getLedger, profitFor } from "./ledger";
import { getProductPerformance, type ProductPerformance } from "./products";

export const PROFIT_SORTS = ["profit-desc", "profit-asc", "margin-desc", "margin-asc", "revenue-desc", "losses"] as const;
export type ProfitSort = (typeof PROFIT_SORTS)[number];
export const PROFIT_SORT_LABEL: Record<ProfitSort, string> = {
  "profit-desc": "Highest profit",
  "profit-asc": "Lowest profit",
  "margin-desc": "Highest margin",
  "margin-asc": "Lowest margin",
  "revenue-desc": "Highest revenue",
  losses: "Largest losses",
};

export type ProfitRow = {
  id: string;
  sku: string;
  name: string;
  unitsSold: number;
  grossSales: string;
  discounts: string;
  netSales: string;
  cogs: string;
  fees: string;
  shipping: string;
  advertising: string;
  returns: string;
  netProfit: string;
  netProfitNegative: boolean;
  margin: string;
  profitPerUnit: string;
  coverage: "estimated" | "incomplete" | "no-sales";
};

function sortRows(rows: ProductPerformance[], sort: ProfitSort): ProductPerformance[] {
  const profit = (r: ProductPerformance) => r.profit.operatingNetProfit;
  const margin = (r: ProductPerformance) => r.profit.netProfitMargin;
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "profit-asc":
        return compareNullable(profit(a), profit(b), (x, y) => x.cmp(y), "asc");
      case "margin-desc":
        return compareNullable(margin(a), margin(b), (x, y) => x.cmp(y), "desc");
      case "margin-asc":
        return compareNullable(margin(a), margin(b), (x, y) => x.cmp(y), "asc");
      case "revenue-desc":
        return compareNullable(a.profit.netSales, b.profit.netSales, (x, y) => x.cmp(y), "desc");
      case "losses": {
        const lossA = profit(a)?.isNegative() ? profit(a) : null;
        const lossB = profit(b)?.isNegative() ? profit(b) : null;
        return compareNullable(lossA, lossB, (x, y) => x.cmp(y), "asc");
      }
      case "profit-desc":
      default:
        return compareNullable(profit(a), profit(b), (x, y) => x.cmp(y), "desc");
    }
  });
}

export function getProfitabilityView(
  args: { filters: GlobalFilters; q: string; sort: ProfitSort },
  dataset: DemoDataset = demoDataset,
) {
  const scope = { range: args.filters.range, marketplace: args.filters.marketplace };
  const performance = getProductPerformance(scope, dataset);
  const q = args.q.toLowerCase();
  let rows = performance.filter(
    (r) => !q || r.product.sku.toLowerCase().includes(q) || r.product.name.toLowerCase().includes(q),
  );
  if (args.sort === "losses") rows = rows.filter((r) => r.profit.operatingNetProfit?.isNegative());
  const sorted = sortRows(rows, args.sort);

  const productTotal = performance.reduce<Money | null>(
    (sum, r) => (sum && r.profit.operatingNetProfit ? sum.add(r.profit.operatingNetProfit) : null),
    Money.zero(),
  );
  const workspace = profitFor(getLedger(dataset), scope);

  return {
    rows: sorted.map((r): ProfitRow => {
      const p = r.profit;
      const net = p.operatingNetProfit;
      return {
        id: r.product.id,
        sku: r.product.sku,
        name: r.product.name,
        unitsSold: r.units.soldUnits,
        grossSales: formatInr(p.grossItemSales, { decimals: 0 }),
        // Gross − (discounts + cancelled value) = net sales, so the columns add up.
        discounts: formatInr(p.discounts.add(p.cancelledItemValue).mul(-1), { decimals: 0 }),
        netSales: formatInr(p.netSales, { decimals: 0 }),
        cogs: formatInr(p.cogs?.mul(-1), { decimals: 0, fallback: "Unknown" }),
        fees: formatInr(p.variableFees.mul(-1), { decimals: 0 }),
        shipping: formatInr(p.fulfillmentAndShipping.mul(-1), { decimals: 0 }),
        advertising: formatInr(p.advertising.mul(-1), { decimals: 0 }),
        returns: formatInr(p.refundAndReturnLosses.mul(-1), { decimals: 0 }),
        netProfit: formatInr(net, { decimals: 0, fallback: "Unknown" }),
        netProfitNegative: net?.isNegative() ?? false,
        margin: formatPercent(p.netProfitMargin),
        profitPerUnit:
          net && r.units.soldUnits > 0 ? formatInr(net.mul(new Decimal(1).div(r.units.soldUnits)), { decimals: 0 }) : "—",
        coverage: p.coverage === "incomplete" ? "incomplete" : r.units.soldUnits === 0 && p.netSales.isZero() ? "no-sales" : "estimated",
      };
    }),
    reconciliation: {
      productTotal: formatInr(productTotal, { decimals: 0, fallback: "Unknown" }),
      unallocated: formatInr(workspace.otherOperatingExpenses.mul(-1), { decimals: 0 }),
      workspaceTotal: formatInr(workspace.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
    },
  };
}
