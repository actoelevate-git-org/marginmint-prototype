import { demoDataset } from "@/data/demo/seed";
import { MARKETPLACES, type DemoDataset } from "@/data/demo/types";
import { settlementDifference, type ProfitBreakdown } from "@/domain/finance";
import { Money } from "@/domain/money";
import type { Decimal } from "decimal.js";
import { dayKeyOf, isInstantInRange } from "@/lib/dates";
import { MARKETPLACE_LABEL, marketplaceFilterLabel } from "@/lib/marketplaces";
import type { CsvValue } from "@/lib/csv";
import type { GlobalFilters } from "@/lib/search-params";
import { getLedger, profitFor, scopedReturns, unitStatsFor } from "./ledger";
import { getProductPerformance } from "./products";
import { pendingPayouts } from "./settlements";
import { aggregateCampaigns } from "./advertising";

export const REPORT_IDS = [
  "pnl",
  "product-profitability",
  "marketplace-performance",
  "inventory-valuation",
  "low-stock",
  "settlements",
  "returns",
  "advertising",
  "orders",
] as const;
export type ReportId = (typeof REPORT_IDS)[number];

export type ReportDefinition = {
  id: ReportId;
  title: string;
  description: string;
  metrics: string;
  filtered: { range: boolean; marketplace: boolean };
};

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: "pnl",
    title: "Profit & loss summary",
    description: "Net sales through to net profit for the selected period and channel.",
    metrics: "Net sales = gross − discounts − cancelled value. Net profit subtracts COGS, fees, shipping, advertising, return losses and recorded expenses.",
    filtered: { range: true, marketplace: true },
  },
  {
    id: "product-profitability",
    title: "Product profitability",
    description: "Every cost component per SKU, with net profit, margin and profit per unit.",
    metrics: "Product net profit excludes shared overhead, which is not allocated to products. Advertising is attributed by campaign SKU.",
    filtered: { range: true, marketplace: true },
  },
  {
    id: "marketplace-performance",
    title: "Marketplace performance",
    description: "Orders, net sales, net profit, margin, return rate and pending settlement per channel.",
    metrics: "Return rate is unit-level: returned units ÷ sold units in the period. Pending settlement is as of the last sync.",
    filtered: { range: true, marketplace: false },
  },
  {
    id: "inventory-valuation",
    title: "Inventory valuation",
    description: "Sellable units and their value at unit cost for every SKU.",
    metrics: "Available = on hand − reserved. Value = available × unit cost. Point-in-time snapshot.",
    filtered: { range: false, marketplace: false },
  },
  {
    id: "low-stock",
    title: "Low-stock report",
    description: "SKUs at or below their reorder point, with days of cover where history allows.",
    metrics: "Days of cover = available ÷ average daily units sold over the last 30 days (needs ≥ 3 orders).",
    filtered: { range: false, marketplace: false },
  },
  {
    id: "settlements",
    title: "Settlement reconciliation",
    description: "Expected vs actual proceeds per transaction, with differences and status.",
    metrics: "Difference = actual − expected. Negative means underpaid; positive means an unexplained additional credit.",
    filtered: { range: true, marketplace: true },
  },
  {
    id: "returns",
    title: "Returns & refunds",
    description: "Each return with refund, return shipping, inventory recovery and estimated loss.",
    metrics: "Estimated loss = refund + return shipping − cost of inventory recovered into sellable stock.",
    filtered: { range: true, marketplace: true },
  },
  {
    id: "advertising",
    title: "Advertising performance",
    description: "Spend, attributed sales, ROAS and ACOS per campaign.",
    metrics: "ROAS = attributed sales ÷ spend. ACOS = spend ÷ attributed sales × 100. Attributed sales are not necessarily incremental.",
    filtered: { range: true, marketplace: true },
  },
  {
    id: "orders",
    title: "Order register",
    description: "Every order with status, units, value, discounts and fulfilment.",
    metrics: "Order value is item value after discounts, excluding tax and shipping charged to the customer.",
    filtered: { range: true, marketplace: true },
  },
];

/** Plain major-unit decimal for CSV ("1234.50"); empty when unknown. */
function money(m: Money | null | undefined): CsvValue {
  return m ? m.toMajor().toFixed(2) : "";
}
function pct(d: Decimal | null): CsvValue {
  return d ? d.toDecimalPlaces(2).toFixed(2) : "";
}

export type ReportTable = { filename: string; headers: string[]; rows: CsvValue[][] };

function pnlRows(p: ProfitBreakdown): CsvValue[][] {
  return [
    ["Gross item sales", money(p.grossItemSales)],
    ["Discounts", money(p.discounts.mul(-1))],
    ["Cancelled item value", money(p.cancelledItemValue.mul(-1))],
    ["Net sales", money(p.netSales)],
    ["Cost of goods sold", money(p.cogs?.mul(-1))],
    ["Gross profit", money(p.grossProfit)],
    ["Marketplace fees", money(p.variableFees.mul(-1))],
    ["Shipping & fulfilment", money(p.fulfillmentAndShipping.mul(-1))],
    ["Contribution profit", money(p.contributionProfit)],
    ["Advertising", money(p.advertising.mul(-1))],
    ["Refund & return losses", money(p.refundAndReturnLosses.mul(-1))],
    ["Other recorded expenses", money(p.otherOperatingExpenses.mul(-1))],
    ["Net profit", money(p.operatingNetProfit)],
    ["Net profit margin %", pct(p.netProfitMargin)],
    ["Coverage", p.coverage],
  ];
}

export function buildReport(id: ReportId, filters: GlobalFilters, dataset: DemoDataset = demoDataset): ReportTable {
  const ledger = getLedger(dataset);
  const scope = { range: filters.range, marketplace: filters.marketplace };
  const suffix = `${filters.range.startDay}_to_${filters.range.endDay}${filters.marketplace === "ALL" ? "" : `_${filters.marketplace.toLowerCase()}`}`;
  const products = new Map(dataset.products.map((p) => [p.id, p]));

  switch (id) {
    case "pnl":
      return {
        filename: `marginmint_pnl_${suffix}.csv`,
        headers: ["Line", `Amount INR (${marketplaceFilterLabel(filters.marketplace)})`],
        rows: pnlRows(profitFor(ledger, scope)),
      };
    case "product-profitability":
      return {
        filename: `marginmint_product_profitability_${suffix}.csv`,
        headers: ["SKU", "Product", "Units sold", "Gross sales", "Discounts", "Cancelled", "Net sales", "COGS", "Marketplace fees", "Shipping", "Advertising", "Return losses", "Net profit", "Net margin %", "Coverage"],
        rows: getProductPerformance(scope, dataset).map(({ product, profit: p, units }) => [
          product.sku, product.name, units.soldUnits, money(p.grossItemSales), money(p.discounts), money(p.cancelledItemValue),
          money(p.netSales), money(p.cogs), money(p.variableFees), money(p.fulfillmentAndShipping), money(p.advertising),
          money(p.refundAndReturnLosses), money(p.operatingNetProfit), pct(p.netProfitMargin), p.coverage,
        ]),
      };
    case "marketplace-performance":
      return {
        filename: `marginmint_marketplace_performance_${filters.range.startDay}_to_${filters.range.endDay}.csv`,
        headers: ["Marketplace", "Orders", "Net sales", "Net profit", "Net margin %", "Return rate %", "Pending settlement"],
        rows: MARKETPLACES.map((m) => {
          const s = { range: filters.range, marketplace: m };
          const p = profitFor(ledger, s);
          const u = unitStatsFor(ledger, s);
          return [MARKETPLACE_LABEL[m], u.orders, money(p.netSales), money(p.operatingNetProfit), pct(p.netProfitMargin), pct(u.returnRate), money(pendingPayouts(m, dataset).amount)];
        }),
      };
    case "inventory-valuation":
    case "low-stock": {
      const perf = getProductPerformance(scope, dataset).filter((r) => id === "inventory-valuation" || r.lowStock);
      return {
        filename: `marginmint_${id.replace("-", "_")}_${dataset.workspace.today}.csv`,
        headers: ["SKU", "Product", "On hand", "Reserved", "Available", "Reorder point", "Unit cost", "Inventory value", "Avg daily units (30d)", "Days of cover"],
        rows: perf.map((r) => [
          r.product.sku, r.product.name, r.product.onHand, r.product.reserved, r.available, r.product.reorderThreshold,
          money(r.product.unitCostPaise === null ? null : Money.fromMinor(r.product.unitCostPaise)), money(r.inventoryValue),
          r.velocity.kind === "known" ? r.velocity.unitsPerDay.toDecimalPlaces(2).toFixed(2) : "Insufficient sales history",
          r.daysOfCover ? r.daysOfCover.toDecimalPlaces(1).toFixed(1) : "",
        ]),
      };
    }
    case "settlements":
      return {
        filename: `marginmint_settlements_${suffix}.csv`,
        headers: ["Transaction ID", "Marketplace", "Order ID", "Date", "Type", "Expected", "Actual", "Difference", "Status", "Notes"],
        rows: dataset.settlements
          .filter((t) => isInstantInRange(t.occurredAt, filters.range) && (filters.marketplace === "ALL" || t.marketplace === filters.marketplace))
          .map((t) => {
            const pending = t.status === "UNMATCHED";
            return [
              t.id, MARKETPLACE_LABEL[t.marketplace], t.orderId ?? "", dayKeyOf(t.occurredAt), t.type, money(Money.fromMinor(t.expectedPaise)),
              pending ? "" : money(Money.fromMinor(t.actualPaise)),
              pending ? "" : money(settlementDifference({ expected: Money.fromMinor(t.expectedPaise), actual: Money.fromMinor(t.actualPaise) })),
              t.status, t.notes,
            ];
          }),
      };
    case "returns":
      return {
        filename: `marginmint_returns_${suffix}.csv`,
        headers: ["Return ID", "Order ID", "Marketplace", "SKU", "Quantity", "Return date", "Reason", "Refund", "Return shipping", "Inventory recovered", "Estimated loss"],
        rows: scopedReturns(ledger, scope).map((f) => [
          f.id, f.orderId, MARKETPLACE_LABEL[f.marketplace], products.get(f.productId)?.sku ?? f.productId, f.units, f.day, f.reason,
          money(f.refund), money(f.returnShipping), f.recoveredCost.isZero() ? "No" : "Yes", money(f.loss),
        ]),
      };
    case "advertising":
      return {
        filename: `marginmint_advertising_${suffix}.csv`,
        headers: ["Campaign", "Marketplace", "SKU", "Spend", "Attributed sales", "Attributed orders", "Clicks", "Impressions", "ROAS", "ACOS %"],
        rows: aggregateCampaigns(filters, dataset).campaigns.map((c) => [
          c.campaign, c.marketplace, c.sku, money(c.spend), money(c.attributed), c.orders, c.clicks, c.impressions,
          c.roas ? c.roas.toDecimalPlaces(2).toFixed(2) : "", pct(c.acos),
        ]),
      };
    case "orders":
      return {
        filename: `marginmint_orders_${suffix}.csv`,
        headers: ["Order ID", "Order date", "Marketplace", "Customer ref", "SKUs", "Units", "Gross value", "Discounts", "Order value", "Status", "Fulfilment"],
        rows: dataset.orders
          .filter((o) => isInstantInRange(o.orderedAt, filters.range) && (filters.marketplace === "ALL" || o.marketplace === filters.marketplace))
          .map((o) => {
            const lines = ledger.lines.filter((l) => l.orderId === o.id);
            const gross = lines.reduce((s, l) => s.add(l.gross), Money.zero());
            const discounts = lines.reduce((s, l) => s.add(l.discount), Money.zero());
            return [
              o.id, dayKeyOf(o.orderedAt), MARKETPLACE_LABEL[o.marketplace], o.customerRef,
              lines.map((l) => products.get(l.productId)?.sku ?? l.productId).join(" "),
              lines.reduce((n, l) => n + l.units, 0), money(gross), money(discounts), money(gross.sub(discounts)), o.status, o.fulfillmentStatus,
            ];
          }),
      };
  }
}
