import { Decimal } from "decimal.js";
import { percentChange, type SalesVelocity } from "./finance";
import { formatInr, formatPercent, Money } from "./money";

/**
 * Deterministic insight rules. Each rule reads pre-computed signals (derived by
 * the service layer from stored records) and emits an insight only when the data
 * supports it. No randomness, no LLM. IDs are stable per rule + entity so the
 * same condition never produces duplicate alerts.
 */

export type InsightSeverity = "critical" | "warning" | "info";

export type InsightType =
  | "stockout-risk"
  | "below-reorder-point"
  | "negative-profit-after-ads"
  | "high-revenue-low-margin"
  | "high-return-rate"
  | "settlement-discrepancy"
  | "ad-spend-outpacing-sales";

export type InsightEntity =
  | { kind: "product"; id: string; sku: string; name: string }
  | { kind: "settlements" }
  | { kind: "advertising" };

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  evidence: string;
  metric: string;
  /** Estimated financial impact when calculable; null otherwise. */
  impact: Money | null;
  action: string;
  entity: InsightEntity;
};

export type ProductSignal = {
  productId: string;
  sku: string;
  name: string;
  netSales: Money;
  advertising: Money;
  /** Contribution profit minus attributable return losses, before advertising. */
  profitBeforeAds: Money | null;
  netProfit: Money | null;
  netMargin: Decimal | null;
  soldUnits: number;
  returnedUnits: number;
  returnRate: Decimal | null;
  available: number;
  reorderThreshold: number;
  velocity: SalesVelocity;
  daysOfCover: Decimal | null;
};

export type WorkspaceSignal = {
  settlementsNeedingReview: { count: number; netDifference: Money; absoluteDifference: Money };
  /** Prior values are null when the prior period lies outside recorded history. */
  adSpend: { current: Money; previous: Money | null };
  netSales: { current: Money; previous: Money | null };
};

export type InsightThresholds = {
  stockCriticalDays: number;
  stockWarningDays: number;
  returnRatePct: number;
  minUnitsForReturnRate: number;
  adSpendIncreasePct: number;
  flatSalesBandPct: number;
  lowMarginPct: number;
  /** Share of products (by net sales rank) treated as "high revenue". */
  highRevenueShare: number;
  /** Losses smaller than this (in rupees) are not worth an alert. */
  materialLossRupees: number;
};

export const DEFAULT_INSIGHT_THRESHOLDS: InsightThresholds = {
  stockCriticalDays: 7,
  stockWarningDays: 14,
  returnRatePct: 15,
  minUnitsForReturnRate: 5,
  adSpendIncreasePct: 20,
  flatSalesBandPct: 5,
  lowMarginPct: 5,
  highRevenueShare: 0.25,
  materialLossRupees: 500,
};

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };

function productEntity(p: ProductSignal): InsightEntity {
  return { kind: "product", id: p.productId, sku: p.sku, name: p.name };
}

function highRevenueIds(products: ProductSignal[], share: number): Set<string> {
  const selling = products.filter((p) => p.netSales.minor.gt(0)).sort((a, b) => b.netSales.cmp(a.netSales));
  const count = Math.max(1, Math.ceil(selling.length * share));
  return new Set(selling.slice(0, count).map((p) => p.productId));
}

function stockRules(products: ProductSignal[], t: InsightThresholds): Insight[] {
  const insights: Insight[] = [];
  const profitable = products
    .filter((p) => p.netProfit && p.netProfit.minor.gt(0))
    .sort((a, b) => (b.netProfit && a.netProfit ? b.netProfit.cmp(a.netProfit) : 0));
  const topProfit = new Set(profitable.slice(0, Math.max(1, Math.ceil(profitable.length * 0.25))).map((p) => p.productId));

  for (const p of products) {
    if (p.daysOfCover && p.velocity.kind === "known" && p.daysOfCover.lte(t.stockWarningDays)) {
      const days = p.daysOfCover.toDecimalPlaces(0, Decimal.ROUND_FLOOR);
      const isTopProfit = topProfit.has(p.productId);
      const critical = p.daysOfCover.lte(t.stockCriticalDays) || isTopProfit;
      insights.push({
        id: `stockout-risk:${p.productId}`,
        type: "stockout-risk",
        severity: critical ? "critical" : "warning",
        title: days.isZero()
          ? `${p.name} is out of sellable stock`
          : `${p.name} may run out of stock in ${days.toString()} day${days.eq(1) ? "" : "s"}`,
        evidence: `${p.sku} has ${Math.max(0, p.available)} sellable units and sold ${p.velocity.unitsPerDay.toDecimalPlaces(2).toString()} units/day over the last ${p.velocity.windowDays} days (${p.velocity.orders} orders).${isTopProfit ? " It is one of your most profitable products." : ""}`,
        metric: `${days.toString()} days of cover`,
        impact: null,
        action: "Raise a purchase order or reduce ad spend until stock arrives.",
        entity: productEntity(p),
      });
    } else if (p.available <= p.reorderThreshold && p.velocity.kind === "insufficient") {
      insights.push({
        id: `below-reorder-point:${p.productId}`,
        type: "below-reorder-point",
        severity: "info",
        title: `${p.name} is at or below its reorder point`,
        evidence: `${p.sku} has ${Math.max(0, p.available)} sellable units against a reorder point of ${p.reorderThreshold}. Insufficient sales history to forecast a stock-out date.`,
        metric: `${Math.max(0, p.available)} units available`,
        impact: null,
        action: "Confirm demand and decide whether to restock.",
        entity: productEntity(p),
      });
    }
  }
  return insights;
}

function profitabilityRules(products: ProductSignal[], t: InsightThresholds): Insight[] {
  const insights: Insight[] = [];
  const highRevenue = highRevenueIds(products, t.highRevenueShare);
  for (const p of products) {
    if (!p.netProfit || !p.profitBeforeAds || p.netSales.minor.lte(0)) continue;
    const materialLoss = p.netProfit.isNegative() && p.netProfit.abs().toMajor().gte(t.materialLossRupees);
    if (materialLoss && p.profitBeforeAds.minor.gt(0) && p.advertising.minor.gt(0)) {
      insights.push({
        id: `negative-profit-after-ads:${p.productId}`,
        type: "negative-profit-after-ads",
        severity: "critical",
        title: `${p.name} loses money after advertising`,
        evidence: `${p.sku} generated ${formatInr(p.netSales, { decimals: 0 })} in net sales and ${formatInr(p.profitBeforeAds, { decimals: 0 })} before advertising, but ${formatInr(p.advertising, { decimals: 0 })} of ad spend produced an estimated loss of ${formatInr(p.netProfit.abs(), { decimals: 0 })}.`,
        metric: `${formatPercent(p.netMargin)} net margin`,
        impact: p.netProfit,
        action: "Review bids and pause unprofitable keywords, or revisit the selling price.",
        entity: productEntity(p),
      });
    } else if (
      highRevenue.has(p.productId) &&
      p.netMargin &&
      p.netMargin.gte(0) &&
      p.netMargin.lt(t.lowMarginPct)
    ) {
      insights.push({
        id: `high-revenue-low-margin:${p.productId}`,
        type: "high-revenue-low-margin",
        severity: "warning",
        title: `${p.name} sells well but barely makes money`,
        evidence: `${p.sku} is in your top ${Math.round(t.highRevenueShare * 100)}% by net sales (${formatInr(p.netSales, { decimals: 0 })}) but keeps only ${formatPercent(p.netMargin)} as net profit.`,
        metric: `${formatPercent(p.netMargin)} net margin`,
        impact: p.netProfit,
        action: "Check fees, discounting and advertising allocation for this SKU.",
        entity: productEntity(p),
      });
    }
  }
  return insights;
}

function returnRules(products: ProductSignal[], t: InsightThresholds): Insight[] {
  return products
    .filter((p) => p.returnRate && p.soldUnits >= t.minUnitsForReturnRate && p.returnRate.gte(t.returnRatePct))
    .map((p) => ({
      id: `high-return-rate:${p.productId}`,
      type: "high-return-rate" as const,
      severity: "warning" as const,
      title: `${p.name} has an unusually high return rate`,
      evidence: `${p.returnedUnits} of ${p.soldUnits} units sold were returned in this period (unit-level rate, threshold ${t.returnRatePct}%).`,
      metric: `${formatPercent(p.returnRate)} return rate`,
      impact: null,
      action: "Inspect return reasons and the listing's sizing and photos.",
      entity: productEntity(p),
    }));
}

function settlementRules(w: WorkspaceSignal): Insight[] {
  const review = w.settlementsNeedingReview;
  if (review.count === 0 || review.absoluteDifference.isZero()) return [];
  return [
    {
      id: "settlement-discrepancy:workspace",
      type: "settlement-discrepancy",
      severity: "warning",
      title: `${formatInr(review.absoluteDifference, { decimals: 0 })} in settlement differences requires review`,
      evidence: `${review.count} settlement transaction${review.count === 1 ? "" : "s"} did not match expected proceeds. Net difference (actual − expected) is ${formatInr(review.netDifference, { decimals: 0, signDisplay: "always" })}; negative means you were underpaid.`,
      metric: `${review.count} to review`,
      impact: review.netDifference,
      action: "Open each transaction, compare fee components and raise a claim where justified.",
      entity: { kind: "settlements" },
    },
  ];
}

function advertisingRules(w: WorkspaceSignal, t: InsightThresholds): Insight[] {
  if (!w.adSpend.previous || !w.netSales.previous) return [];
  const spendChange = percentChange(w.adSpend.current, w.adSpend.previous);
  const salesChange = percentChange(w.netSales.current, w.netSales.previous);
  if (!spendChange || !salesChange) return [];
  if (spendChange.lt(t.adSpendIncreasePct) || salesChange.abs().gt(t.flatSalesBandPct)) return [];
  return [
    {
      id: "ad-spend-outpacing-sales:workspace",
      type: "ad-spend-outpacing-sales",
      severity: "warning",
      title: "Advertising spend increased while sales stayed flat",
      evidence: `Ad spend rose ${formatPercent(spendChange)} to ${formatInr(w.adSpend.current, { decimals: 0 })} versus the prior period, while net sales moved ${formatPercent(salesChange)}.`,
      metric: `+${formatPercent(spendChange)} ad spend`,
      impact: w.adSpend.current.sub(w.adSpend.previous),
      action: "Compare campaign ROAS and cut spend on campaigns that did not add sales.",
      entity: { kind: "advertising" },
    },
  ];
}

export function generateInsights(args: {
  products: ProductSignal[];
  workspace: WorkspaceSignal;
  thresholds?: InsightThresholds;
}): Insight[] {
  const t = args.thresholds ?? DEFAULT_INSIGHT_THRESHOLDS;
  const all = [
    ...stockRules(args.products, t),
    ...profitabilityRules(args.products, t),
    ...returnRules(args.products, t),
    ...settlementRules(args.workspace),
    ...advertisingRules(args.workspace, t),
  ];
  const unique = new Map(all.map((insight) => [insight.id, insight]));
  return [...unique.values()].sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    const impactA = a.impact?.abs().minor ?? new Decimal(0);
    const impactB = b.impact?.abs().minor ?? new Decimal(0);
    return impactB.cmp(impactA) || a.id.localeCompare(b.id);
  });
}
