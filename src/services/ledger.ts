import type { DemoDataset, Marketplace } from "@/data/demo/types";
import type { MarketplaceFilter } from "@/lib/marketplaces";
import { allocateProportionally, computeProfitBreakdown, returnRate, type ProfitBreakdown } from "@/domain/finance";
import { Money } from "@/domain/money";
import { dayKeyOf, isDayInRange, type DateRange, type DayKey } from "@/lib/dates";
import type { Decimal } from "decimal.js";

/**
 * The ledger normalises raw records into per-line financial facts once, so every
 * page (dashboard, tables, reports) aggregates the same facts with the same
 * domain formulas. Nothing here is UI-specific.
 *
 * Attribution policy:
 * - Order-level shipping is allocated to lines in proportion to line net value.
 * - Advertising is attributed to the campaign's product and marketplace.
 * - Expenses with a marketplace count toward that marketplace; shared overhead
 *   (marketplace = null) is included only in workspace-wide ("All") totals and
 *   is never allocated to products.
 */

export type { MarketplaceFilter };

export type Scope = {
  range: DateRange;
  marketplace: MarketplaceFilter;
  productId?: string;
};

export type LineFact = {
  orderId: string;
  day: DayKey;
  marketplace: Marketplace;
  productId: string;
  cancelled: boolean;
  units: number;
  gross: Money;
  discount: Money;
  cogs: Money | null;
  fees: Money;
  shipping: Money;
};

export type ReturnFact = {
  id: string;
  orderId: string;
  reason: string;
  day: DayKey;
  marketplace: Marketplace;
  productId: string;
  units: number;
  refund: Money;
  returnShipping: Money;
  recoveredCost: Money;
  /** refund + return shipping − recovered inventory cost */
  loss: Money;
};

export type AdFact = { day: DayKey; marketplace: Marketplace; productId: string | null; spend: Money; attributed: Money };
export type ExpenseFact = { day: DayKey; marketplace: Marketplace | null; amount: Money };

export type Ledger = {
  dataset: DemoDataset;
  lines: LineFact[];
  returns: ReturnFact[];
  ads: AdFact[];
  expenses: ExpenseFact[];
};

const cache = new WeakMap<DemoDataset, Ledger>();

export function getLedger(dataset: DemoDataset): Ledger {
  const cached = cache.get(dataset);
  if (cached) return cached;
  const ledger = buildLedger(dataset);
  cache.set(dataset, ledger);
  return ledger;
}

function buildLedger(dataset: DemoDataset): Ledger {
  const productCost = new Map(dataset.products.map((p) => [p.id, p.unitCostPaise]));

  const lines: LineFact[] = dataset.orders.flatMap((order) => {
    const day = dayKeyOf(order.orderedAt);
    const cancelled = order.status === "CANCELLED";
    const lineNets = order.items.map((item) =>
      Money.fromMinor(item.unitPricePaise).mul(item.quantity).sub(Money.fromMinor(item.discountPaise)),
    );
    const shippingShares = cancelled
      ? order.items.map(() => Money.zero())
      : allocateProportionally(Money.fromMinor(order.shippingPaise), lineNets);
    return order.items.map((item, index) => ({
      orderId: order.id,
      day,
      marketplace: order.marketplace,
      productId: item.productId,
      cancelled,
      units: item.quantity,
      gross: Money.fromMinor(item.unitPricePaise).mul(item.quantity),
      discount: Money.fromMinor(item.discountPaise),
      cogs: item.unitCostPaise === null ? null : Money.fromMinor(item.unitCostPaise).mul(item.quantity),
      fees: cancelled ? Money.zero() : Money.fromMinor(item.feePaise),
      shipping: shippingShares[index] ?? Money.zero(),
    }));
  });

  const returns: ReturnFact[] = dataset.returns.map((row) => {
    const refund = Money.fromMinor(row.refundPaise);
    const returnShipping = Money.fromMinor(row.returnShippingPaise);
    const unitCost = productCost.get(row.productId);
    // Without a known unit cost no recovery credit is taken (conservative).
    const recoveredCost =
      row.recoveredInventory && unitCost != null ? Money.fromMinor(unitCost).mul(row.quantity) : Money.zero();
    return {
      id: row.id,
      orderId: row.orderId,
      reason: row.reason,
      day: dayKeyOf(row.returnedAt),
      marketplace: row.marketplace,
      productId: row.productId,
      units: row.quantity,
      refund,
      returnShipping,
      recoveredCost,
      loss: refund.add(returnShipping).sub(recoveredCost),
    };
  });

  const ads: AdFact[] = dataset.advertising.map((row) => ({
    day: row.date,
    marketplace: row.marketplace,
    productId: row.productId,
    spend: Money.fromMinor(row.spendPaise),
    attributed: Money.fromMinor(row.attributedSalesPaise),
  }));

  const expenses: ExpenseFact[] = dataset.expenses.map((row) => ({
    day: row.date,
    marketplace: row.marketplace,
    amount: Money.fromMinor(row.amountPaise),
  }));

  return { dataset, lines, returns, ads, expenses };
}

function inScope(fact: { day: DayKey; marketplace: Marketplace }, scope: Scope): boolean {
  return isDayInRange(fact.day, scope.range) && (scope.marketplace === "ALL" || fact.marketplace === scope.marketplace);
}

function sum<T>(rows: T[], pickAmount: (row: T) => Money): Money {
  return rows.reduce((total, row) => total.add(pickAmount(row)), Money.zero());
}

export function scopedLines(ledger: Ledger, scope: Scope): LineFact[] {
  return ledger.lines.filter(
    (line) => inScope(line, scope) && (scope.productId === undefined || line.productId === scope.productId),
  );
}

export function scopedReturns(ledger: Ledger, scope: Scope): ReturnFact[] {
  return ledger.returns.filter(
    (row) => inScope(row, scope) && (scope.productId === undefined || row.productId === scope.productId),
  );
}

export function scopedAds(ledger: Ledger, scope: Scope): AdFact[] {
  return ledger.ads.filter(
    (row) => inScope(row, scope) && (scope.productId === undefined || row.productId === scope.productId),
  );
}

export function scopedExpenses(ledger: Ledger, scope: Scope): ExpenseFact[] {
  if (scope.productId !== undefined) return [];
  return ledger.expenses.filter(
    (row) =>
      isDayInRange(row.day, scope.range) &&
      (scope.marketplace === "ALL" ? true : row.marketplace === scope.marketplace),
  );
}

export function profitFor(ledger: Ledger, scope: Scope): ProfitBreakdown {
  const lines = scopedLines(ledger, scope);
  const kept = lines.filter((line) => !line.cancelled);
  const cancelled = lines.filter((line) => line.cancelled);
  const cogsMissing = kept.some((line) => line.cogs === null);

  return computeProfitBreakdown({
    grossItemSales: sum(lines, (line) => line.gross),
    discounts: sum(kept, (line) => line.discount),
    cancelledItemValue: sum(cancelled, (line) => line.gross.sub(line.discount)),
    cogs: cogsMissing ? null : sum(kept, (line) => line.cogs ?? Money.zero()),
    variableFees: sum(kept, (line) => line.fees),
    fulfillmentAndShipping: sum(kept, (line) => line.shipping),
    otherVariableCosts: Money.zero(),
    advertising: sum(scopedAds(ledger, scope), (row) => row.spend),
    otherOperatingExpenses: sum(scopedExpenses(ledger, scope), (row) => row.amount),
    refundAndReturnLosses: sum(scopedReturns(ledger, scope), (row) => row.loss),
  });
}

export type UnitStats = {
  orders: number;
  soldUnits: number;
  returnedUnits: number;
  returnRate: Decimal | null;
};

/** Unit-level stats. Sold units exclude cancelled lines; orders count distinct non-cancelled orders. */
export function unitStatsFor(ledger: Ledger, scope: Scope): UnitStats {
  const kept = scopedLines(ledger, scope).filter((line) => !line.cancelled);
  const soldUnits = kept.reduce((n, line) => n + line.units, 0);
  const returnedUnits = scopedReturns(ledger, scope).reduce((n, row) => n + row.units, 0);
  return {
    orders: new Set(kept.map((line) => line.orderId)).size,
    soldUnits,
    returnedUnits,
    returnRate: returnRate({ returnedUnits, soldUnits }),
  };
}

export function adTotalsFor(ledger: Ledger, scope: Scope): { spend: Money; attributed: Money } {
  const rows = scopedAds(ledger, scope);
  return { spend: sum(rows, (row) => row.spend), attributed: sum(rows, (row) => row.attributed) };
}

/** Whether every day of `range` falls inside recorded history. */
export function isRangeCovered(ledger: Ledger, range: DateRange): boolean {
  return range.startDay >= ledger.dataset.workspace.dataStartDay && range.endDay <= ledger.dataset.workspace.today;
}
