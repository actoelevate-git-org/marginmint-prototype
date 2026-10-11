import type { Decimal } from "decimal.js";
import { demoDataset } from "@/data/demo/seed";
import { MARKETPLACES, type DemoDataset, type Marketplace } from "@/data/demo/types";
import { percentagePointChange, percentChange, type ProfitBreakdown } from "@/domain/finance";
import { generateInsights, type Insight } from "@/domain/insights";
import { formatInr, formatInrCompact, formatPercent, Money } from "@/domain/money";
import {
  describeRange,
  eachDay,
  formatDayShort,
  formatInstantIst,
  previousEquivalentRange,
  rangeLength,
  weekStartOf,
  type DateRange,
} from "@/lib/dates";
import { MARKETPLACE_LABEL, marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, type GlobalFilters } from "@/lib/search-params";
import { adTotalsFor, getLedger, isRangeCovered, profitFor, scopedExpenses, unitStatsFor, type Ledger } from "./ledger";
import { getProductPerformance, toProductSignal, totalInventoryValue } from "./products";
import { pendingPayouts, reviewDiscrepancies } from "./settlements";

export type DeltaModel =
  | { kind: "change"; text: string; direction: "up" | "down" | "flat"; tone: "positive" | "negative" | "neutral" }
  | { kind: "unavailable"; text: string };

export type SparkPoint = { label: string; value: number | null; text: string };

export type KpiModel = {
  id: "net-sales" | "gross-profit" | "net-profit" | "net-margin" | "inventory-value" | "settlement-pending";
  label: string;
  definition: string;
  value: string;
  /** Exact value (paise precision) for title/tooltip. */
  exactValue: string;
  valueTone: "default" | "negative" | "unknown";
  delta: DeltaModel | null;
  context: string;
  sparkline: SparkPoint[] | null;
};

export type TrendPoint = {
  key: string;
  label: string;
  detail: string;
  netSales: number;
  grossProfit: number | null;
  netProfit: number | null;
  netSalesText: string;
  grossProfitText: string;
  netProfitText: string;
};

export type WaterfallStep = {
  id: string;
  label: string;
  kind: "total" | "deduction" | "result";
  /** [low, high] in rupees for a floating bar. */
  span: [number, number];
  amountText: string;
  shareText: string;
  negativeResult: boolean;
};

export type MarketplaceRow = {
  id: Marketplace | "OVERHEAD" | "TOTAL";
  label: string;
  selected: boolean;
  orders: string;
  netSales: string;
  netProfit: string;
  netProfitNegative: boolean;
  margin: string;
  returnRate: string;
  pendingSettlement: string;
};

export type InsightModel = Omit<Insight, "impact" | "entity"> & {
  impactText: string | null;
  href: string;
  linkLabel: string;
};

export type DashboardModel = {
  workspaceName: string;
  ownerName: string;
  isDemo: true;
  lastSyncedLabel: string;
  rangeLabel: string;
  comparisonLabel: string | null;
  marketplaceLabel: string;
  exportHref: string;
  coverage: { status: ProfitBreakdown["coverage"]; reason: string };
  kpis: KpiModel[];
  trend: { daily: TrendPoint[]; weekly: TrendPoint[] };
  waterfall: { steps: WaterfallStep[] } | { unavailable: string };
  marketplaces: MarketplaceRow[];
  sharedOverheadNote: string | null;
  insights: InsightModel[];
};

const toNumber = (money: Money): number => money.toMajor().toNumber();

function moneyDelta(current: Money | null, previous: Money | null, comparable: boolean): DeltaModel {
  if (!comparable) return { kind: "unavailable", text: "No prior-period history" };
  if (!current || !previous) return { kind: "unavailable", text: "Prior value unknown" };
  const change = percentChange(current, previous);
  if (change === null) return { kind: "unavailable", text: "Prior period was zero" };
  const rounded = change.toDecimalPlaces(1);
  const direction = rounded.isZero() ? "flat" : rounded.isPositive() ? "up" : "down";
  return {
    kind: "change",
    text: `${rounded.isPositive() && !rounded.isZero() ? "+" : ""}${formatPercent(rounded)}`,
    direction,
    tone: direction === "flat" ? "neutral" : direction === "up" ? "positive" : "negative",
  };
}

function marginDelta(current: Decimal | null, previous: Decimal | null, comparable: boolean): DeltaModel {
  if (!comparable) return { kind: "unavailable", text: "No prior-period history" };
  const change = percentagePointChange(current, previous);
  if (change === null) return { kind: "unavailable", text: "Prior margin undefined" };
  const rounded = change.toDecimalPlaces(1);
  const direction = rounded.isZero() ? "flat" : rounded.isPositive() ? "up" : "down";
  const sign = rounded.isPositive() && !rounded.isZero() ? "+" : rounded.isNegative() ? "−" : "";
  return {
    kind: "change",
    text: `${sign}${rounded.abs().toFixed(1)} pp`,
    direction,
    tone: direction === "flat" ? "neutral" : direction === "up" ? "positive" : "negative",
  };
}

function dayRange(day: string): DateRange {
  return { preset: "custom", startDay: day, endDay: day };
}

function sparkFor(
  daily: { day: string; profit: ProfitBreakdown }[],
  pick: (p: ProfitBreakdown) => { value: number | null; text: string },
): SparkPoint[] | null {
  if (daily.length < 2) return null;
  return daily.map(({ day, profit }) => ({ label: formatDayShort(day), ...pick(profit) }));
}

function buildTrend(ledger: Ledger, filters: GlobalFilters): DashboardModel["trend"] {
  const point = (key: string, label: string, detail: string, profit: ProfitBreakdown): TrendPoint => ({
    key,
    label,
    detail,
    netSales: toNumber(profit.netSales),
    grossProfit: profit.grossProfit ? toNumber(profit.grossProfit) : null,
    netProfit: profit.operatingNetProfit ? toNumber(profit.operatingNetProfit) : null,
    netSalesText: formatInr(profit.netSales, { decimals: 0 }),
    grossProfitText: formatInr(profit.grossProfit, { decimals: 0, fallback: "Unknown" }),
    netProfitText: formatInr(profit.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
  });

  const days = eachDay(filters.range);
  const daily = days.map((day) =>
    point(day, formatDayShort(day), describeRange(dayRange(day)), profitFor(ledger, { range: dayRange(day), marketplace: filters.marketplace })),
  );

  const weeks = new Map<string, string[]>();
  for (const day of days) {
    const week = weekStartOf(day);
    weeks.set(week, [...(weeks.get(week) ?? []), day]);
  }
  const weekly = [...weeks.entries()].map(([week, weekDays]) => {
    const range: DateRange = { preset: "custom", startDay: weekDays[0] ?? week, endDay: weekDays[weekDays.length - 1] ?? week };
    const partial = weekDays.length < 7;
    return point(
      week,
      formatDayShort(range.startDay),
      `${describeRange(range)}${partial ? ` · partial week (${weekDays.length} days)` : ""}`,
      profitFor(ledger, { range, marketplace: filters.marketplace }),
    );
  });
  return { daily, weekly };
}

function buildWaterfall(profit: ProfitBreakdown): DashboardModel["waterfall"] {
  if (!profit.cogs || !profit.operatingNetProfit) {
    return { unavailable: profit.coverageReason };
  }
  if (!profit.netSales.minor.gt(0)) {
    return { unavailable: "No net sales in this period, so there is nothing to break down." };
  }
  const share = (m: Money) => {
    const pct = m.toMajor().div(profit.netSales.toMajor()).mul(100);
    return `${formatPercent(pct)} of net sales`;
  };
  const steps: WaterfallStep[] = [];
  const sales = toNumber(profit.netSales);
  steps.push({
    id: "net-sales",
    label: "Net sales",
    kind: "total",
    span: [0, sales],
    amountText: formatInr(profit.netSales, { decimals: 0 }),
    shareText: "100% of net sales",
    negativeResult: false,
  });
  let running = profit.netSales;
  const deductions: [string, string, Money][] = [
    ["cogs", "Cost of goods sold", profit.cogs],
    ["fees", "Marketplace fees", profit.variableFees],
    ["shipping", "Shipping & fulfilment", profit.fulfillmentAndShipping],
    ["advertising", "Advertising", profit.advertising],
    ["returns", "Refund & return losses", profit.refundAndReturnLosses],
    ["other", "Other expenses", profit.otherOperatingExpenses],
  ];
  for (const [id, label, amount] of deductions) {
    const next = running.sub(amount);
    const a = toNumber(running);
    const b = toNumber(next);
    steps.push({
      id,
      label,
      kind: "deduction",
      span: [Math.min(a, b), Math.max(a, b)],
      amountText: formatInr(amount.mul(-1), { decimals: 0 }),
      shareText: share(amount),
      negativeResult: false,
    });
    running = next;
  }
  const net = profit.operatingNetProfit;
  const netValue = toNumber(net);
  steps.push({
    id: "net-profit",
    label: "Net profit",
    kind: "result",
    span: [Math.min(0, netValue), Math.max(0, netValue)],
    amountText: formatInr(net, { decimals: 0 }),
    shareText: profit.netProfitMargin ? `${formatPercent(profit.netProfitMargin)} margin` : "Margin undefined",
    negativeResult: net.isNegative(),
  });
  return { steps };
}

function buildMarketplaceRows(ledger: Ledger, filters: GlobalFilters, dataset: DemoDataset) {
  const rows: MarketplaceRow[] = MARKETPLACES.map((marketplace) => {
    const scope = { range: filters.range, marketplace };
    const profit = profitFor(ledger, scope);
    const units = unitStatsFor(ledger, scope);
    return {
      id: marketplace,
      label: MARKETPLACE_LABEL[marketplace],
      selected: filters.marketplace === marketplace,
      orders: units.orders.toLocaleString("en-IN"),
      netSales: formatInr(profit.netSales, { decimals: 0 }),
      netProfit: formatInr(profit.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
      netProfitNegative: profit.operatingNetProfit?.isNegative() ?? false,
      margin: formatPercent(profit.netProfitMargin),
      returnRate: formatPercent(units.returnRate),
      pendingSettlement: formatInr(pendingPayouts(marketplace, dataset).amount, { decimals: 0 }),
    };
  });

  const allScope = { range: filters.range, marketplace: "ALL" as const };
  const total = profitFor(ledger, allScope);
  const totalUnits = unitStatsFor(ledger, allScope);
  const overhead = scopedExpenses(ledger, allScope)
    .filter((row) => row.marketplace === null)
    .reduce((sum, row) => sum.add(row.amount), Money.zero());

  if (!overhead.isZero()) {
    rows.push({
      id: "OVERHEAD",
      label: "Shared overhead",
      selected: false,
      orders: "—",
      netSales: "—",
      netProfit: formatInr(overhead.mul(-1), { decimals: 0 }),
      netProfitNegative: true,
      margin: "—",
      returnRate: "—",
      pendingSettlement: "—",
    });
  }
  rows.push({
    id: "TOTAL",
    label: "All marketplaces",
    selected: filters.marketplace === "ALL",
    orders: totalUnits.orders.toLocaleString("en-IN"),
    netSales: formatInr(total.netSales, { decimals: 0 }),
    netProfit: formatInr(total.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
    netProfitNegative: total.operatingNetProfit?.isNegative() ?? false,
    margin: formatPercent(total.netProfitMargin),
    returnRate: formatPercent(totalUnits.returnRate),
    pendingSettlement: formatInr(pendingPayouts("ALL", dataset).amount, { decimals: 0 }),
  });

  const note = overhead.isZero()
    ? null
    : `Shared overhead (${formatInr(overhead, { decimals: 0 })} of packaging and software) is not attributable to one marketplace, so it appears as its own row. Marketplace rows plus overhead equal the total.`;
  return { rows, note };
}

function insightLink(insight: Insight, filterQuery: string): { href: string; linkLabel: string } {
  const withQuery = (path: string, extra: Record<string, string>) => {
    const query = new URLSearchParams(filterQuery);
    for (const [k, v] of Object.entries(extra)) query.set(k, v);
    return `${path}?${query.toString()}`;
  };
  const entity = insight.entity;
  switch (entity.kind) {
    case "settlements":
      return { href: withQuery("/settlements", { status: "NEEDS_REVIEW" }), linkLabel: "Review settlements" };
    case "advertising":
      return { href: withQuery("/advertising", {}), linkLabel: "Open advertising" };
    case "product":
      switch (insight.type) {
        case "stockout-risk":
        case "below-reorder-point":
          return { href: withQuery("/products", { q: entity.sku }), linkLabel: `View ${entity.sku} stock` };
        case "high-return-rate":
          return { href: withQuery("/returns", { q: entity.sku }), linkLabel: `View ${entity.sku} returns` };
        default:
          return { href: withQuery("/profitability", { q: entity.sku }), linkLabel: `View ${entity.sku} profitability` };
      }
  }
}

export function getDashboardModel(filters: GlobalFilters, dataset: DemoDataset = demoDataset): DashboardModel {
  const ledger = getLedger(dataset);
  const scope = { range: filters.range, marketplace: filters.marketplace };
  const previousRange = previousEquivalentRange(filters.range);
  const comparable = isRangeCovered(ledger, previousRange);
  const current = profitFor(ledger, scope);
  const previous = profitFor(ledger, { ...scope, range: previousRange });

  const daily = rangeLength(filters.range) > 1
    ? eachDay(filters.range).map((day) => ({ day, profit: profitFor(ledger, { ...scope, range: dayRange(day) }) }))
    : [];
  const comparisonLabel = comparable ? `vs ${describeRange(previousRange)}` : null;
  const inventory = totalInventoryValue(dataset);
  const pending = pendingPayouts(filters.marketplace, dataset);
  const review = reviewDiscrepancies(filters.marketplace, dataset);
  const length = rangeLength(filters.range);
  const contextLine = length === 1 ? "vs previous day" : `vs previous ${length} days`;

  const kpis: KpiModel[] = [
    {
      id: "net-sales",
      label: "Net sales",
      definition:
        "Gross item sales minus discounts and the value of cancelled lines. Settlement payouts are cash movements and are never counted as sales.",
      value: formatInr(current.netSales, { decimals: 0 }),
      exactValue: formatInr(current.netSales),
      valueTone: "default",
      delta: moneyDelta(current.netSales, previous.netSales, comparable),
      context: contextLine,
      sparkline: sparkFor(daily, (p) => ({ value: toNumber(p.netSales), text: formatInr(p.netSales, { decimals: 0 }) })),
    },
    {
      id: "gross-profit",
      label: "Gross profit",
      definition: "Net sales minus cost of goods sold (COGS). If any sold line is missing a unit cost, gross profit is unknown rather than zero.",
      value: formatInr(current.grossProfit, { decimals: 0, fallback: "Unknown" }),
      exactValue: formatInr(current.grossProfit, { fallback: "Unknown" }),
      valueTone: current.grossProfit === null ? "unknown" : current.grossProfit.isNegative() ? "negative" : "default",
      delta: moneyDelta(current.grossProfit, previous.grossProfit, comparable),
      context: contextLine,
      sparkline: sparkFor(daily, (p) => ({
        value: p.grossProfit ? toNumber(p.grossProfit) : null,
        text: formatInr(p.grossProfit, { decimals: 0, fallback: "Unknown" }),
      })),
    },
    {
      id: "net-profit",
      label: "Net profit",
      definition:
        "Net sales minus COGS, marketplace fees, shipping & fulfilment, advertising, refund & return losses, and other recorded expenses. A management-accounting estimate, not audited profit.",
      value: formatInr(current.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
      exactValue: formatInr(current.operatingNetProfit, { fallback: "Unknown" }),
      valueTone:
        current.operatingNetProfit === null ? "unknown" : current.operatingNetProfit.isNegative() ? "negative" : "default",
      delta: moneyDelta(current.operatingNetProfit, previous.operatingNetProfit, comparable),
      context: contextLine,
      sparkline: sparkFor(daily, (p) => ({
        value: p.operatingNetProfit ? toNumber(p.operatingNetProfit) : null,
        text: formatInr(p.operatingNetProfit, { decimals: 0, fallback: "Unknown" }),
      })),
    },
    {
      id: "net-margin",
      label: "Net profit margin",
      definition: "Net profit ÷ net sales × 100. Shown as — when net sales are zero or profit is unknown. Change is in percentage points (pp).",
      value: formatPercent(current.netProfitMargin),
      exactValue: formatPercent(current.netProfitMargin, 2),
      valueTone: current.netProfitMargin === null ? "unknown" : current.netProfitMargin.isNegative() ? "negative" : "default",
      delta: marginDelta(current.netProfitMargin, previous.netProfitMargin, comparable),
      context: contextLine,
      sparkline: sparkFor(daily, (p) => ({
        value: p.netProfitMargin ? p.netProfitMargin.toDecimalPlaces(1).toNumber() : null,
        text: p.netProfitMargin ? formatPercent(p.netProfitMargin) : "No sales",
      })),
    },
    {
      id: "inventory-value",
      label: "Inventory value",
      definition:
        "Sellable units (on hand − reserved) × unit cost, across all channels because stock is shared. A point-in-time snapshot, so it is not affected by the date or marketplace filters.",
      value: formatInr(inventory.value, { decimals: 0, fallback: "Unknown" }),
      exactValue: formatInr(inventory.value, { fallback: "Unknown" }),
      valueTone: inventory.value === null ? "unknown" : "default",
      delta: null,
      context: `${inventory.units.toLocaleString("en-IN")} sellable units · snapshot, no history yet`,
      sparkline: null,
    },
    {
      id: "settlement-pending",
      label: "Settlement pending",
      definition:
        "Expected marketplace proceeds for shipped or delivered orders that have not been paid out yet. Cash timing only — these are not additional sales. Received payouts with unexplained differences are tracked separately under review.",
      value: formatInr(pending.amount, { decimals: 0 }),
      exactValue: formatInr(pending.amount),
      valueTone: "default",
      delta: null,
      context:
        pending.count === 0
          ? "Nothing awaiting payout"
          : `${pending.count} payout${pending.count === 1 ? "" : "s"} · oldest ${pending.oldestAgeDays ?? 0}d · ${review.count} in review`,
      sparkline: null,
    },
  ];

  const products = getProductPerformance(scope, dataset);
  const prevAds = adTotalsFor(ledger, { ...scope, range: previousRange }).spend;
  const insights = generateInsights({
    products: products.map(toProductSignal),
    workspace: {
      settlementsNeedingReview: review,
      adSpend: { current: current.advertising, previous: comparable ? prevAds : null },
      netSales: { current: current.netSales, previous: comparable ? previous.netSales : null },
    },
  });

  const filterQuery = globalFilterQuery(filters).toString();
  const marketplaceTable = buildMarketplaceRows(ledger, filters, dataset);

  return {
    workspaceName: dataset.workspace.name,
    ownerName: dataset.workspace.ownerName,
    isDemo: true,
    lastSyncedLabel: formatInstantIst(dataset.workspace.lastSyncedAt),
    rangeLabel: describeRange(filters.range),
    comparisonLabel,
    marketplaceLabel: marketplaceFilterLabel(filters.marketplace),
    exportHref: `/api/reports/pnl?${filterQuery}`,
    coverage: { status: current.coverage, reason: current.coverageReason },
    kpis,
    trend: buildTrend(ledger, filters),
    waterfall: buildWaterfall(current),
    marketplaces: marketplaceTable.rows,
    sharedOverheadNote: marketplaceTable.note,
    insights: insights.map(({ impact, entity, ...rest }) => ({
      ...rest,
      impactText: impact ? formatInrCompact(impact) : null,
      ...insightLink({ ...rest, impact, entity }, filterQuery),
    })),
  };
}
