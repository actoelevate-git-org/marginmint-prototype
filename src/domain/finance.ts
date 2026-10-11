import { Decimal } from "decimal.js";
import { Money } from "./money";

/**
 * Sign conventions (management accounting, INR):
 * - Sales, discounts, cancellations, COGS, fees, shipping, ads, expenses, refunds:
 *   stored as non-negative magnitudes unless a field is an explicit signed difference.
 * - Settlement difference = actual received − expected. Positive = more cash received
 *   than expected (overpayment / unexplained credit). Negative = underpayment.
 * - GST collected is not treated as earned revenue in these formulas (demo prices are
 *   treated as tax-exclusive item values).
 * - Settlement payouts are cash movements, never additional sales.
 *
 * Returns policy:
 * - Sales are recognised on the order date; cancelled lines are removed via
 *   `cancelledItemValue`. Returned orders remain in net sales.
 * - Return losses are recognised on the return date:
 *   refund + return shipping − cost of inventory recovered into sellable stock.
 *   COGS for the original sale is not reversed separately, so recovered stock is the
 *   only credit and nothing is subtracted twice.
 */

export type CoverageStatus = "complete" | "estimated" | "incomplete";

export type ProfitInputs = {
  grossItemSales: Money;
  discounts: Money;
  cancelledItemValue: Money;
  cogs: Money | null;
  variableFees: Money;
  fulfillmentAndShipping: Money;
  otherVariableCosts: Money;
  advertising: Money;
  otherOperatingExpenses: Money;
  refundAndReturnLosses: Money;
};

export type ProfitBreakdown = {
  grossItemSales: Money;
  discounts: Money;
  cancelledItemValue: Money;
  netSales: Money;
  cogs: Money | null;
  grossProfit: Money | null;
  variableFees: Money;
  fulfillmentAndShipping: Money;
  otherVariableCosts: Money;
  contributionProfit: Money | null;
  advertising: Money;
  otherOperatingExpenses: Money;
  refundAndReturnLosses: Money;
  operatingNetProfit: Money | null;
  netProfitMargin: Decimal | null;
  coverage: CoverageStatus;
  coverageReason: string;
};

/**
 * `discounts` and `cancelledItemValue` must not overlap: cancelled value is the
 * post-discount value of cancelled lines, and `discounts` covers only lines that
 * were not cancelled.
 */
export function netSales(args: { grossItemSales: Money; discounts: Money; cancelledItemValue: Money }): Money {
  return args.grossItemSales.sub(args.discounts).sub(args.cancelledItemValue);
}

export function grossProfit(args: { netSales: Money; cogs: Money | null }): Money | null {
  if (!args.cogs) {
    return null;
  }
  return args.netSales.sub(args.cogs);
}

export function contributionProfit(args: {
  netSales: Money;
  cogs: Money | null;
  variableFees: Money;
  fulfillmentAndShipping: Money;
  otherVariableCosts: Money;
}): Money | null {
  const gp = grossProfit({ netSales: args.netSales, cogs: args.cogs });
  if (!gp) {
    return null;
  }
  return gp.sub(args.variableFees).sub(args.fulfillmentAndShipping).sub(args.otherVariableCosts);
}

export function operatingNetProfit(args: {
  contributionProfit: Money | null;
  advertising: Money;
  otherOperatingExpenses: Money;
  refundAndReturnLosses: Money;
}): Money | null {
  if (!args.contributionProfit) {
    return null;
  }
  return args.contributionProfit.sub(args.advertising).sub(args.otherOperatingExpenses).sub(args.refundAndReturnLosses);
}

/** Margin % of net sales. Null when profit is unknown or net sales are not positive. */
export function netProfitMargin(operating: Money | null, sales: Money): Decimal | null {
  if (!operating || sales.isZero() || sales.isNegative()) {
    return null;
  }
  return operating.toMajor().div(sales.toMajor()).mul(100);
}

export function computeProfitBreakdown(inputs: ProfitInputs): ProfitBreakdown {
  const sales = netSales(inputs);
  const gp = grossProfit({ netSales: sales, cogs: inputs.cogs });
  const contribution = contributionProfit({
    netSales: sales,
    cogs: inputs.cogs,
    variableFees: inputs.variableFees,
    fulfillmentAndShipping: inputs.fulfillmentAndShipping,
    otherVariableCosts: inputs.otherVariableCosts,
  });
  const operating = operatingNetProfit({
    contributionProfit: contribution,
    advertising: inputs.advertising,
    otherOperatingExpenses: inputs.otherOperatingExpenses,
    refundAndReturnLosses: inputs.refundAndReturnLosses,
  });

  const incomplete = inputs.cogs === null;
  return {
    grossItemSales: inputs.grossItemSales,
    discounts: inputs.discounts,
    cancelledItemValue: inputs.cancelledItemValue,
    netSales: sales,
    cogs: inputs.cogs,
    grossProfit: gp,
    variableFees: inputs.variableFees,
    fulfillmentAndShipping: inputs.fulfillmentAndShipping,
    otherVariableCosts: inputs.otherVariableCosts,
    contributionProfit: contribution,
    advertising: inputs.advertising,
    otherOperatingExpenses: inputs.otherOperatingExpenses,
    refundAndReturnLosses: inputs.refundAndReturnLosses,
    operatingNetProfit: operating,
    netProfitMargin: netProfitMargin(operating, sales),
    coverage: incomplete ? "incomplete" : "estimated",
    coverageReason: incomplete
      ? "Cost of goods sold is missing for at least one sold line — profit is unknown, not zero."
      : "Management-accounting estimate from recorded orders, fees, advertising, returns and expenses. Not audited statutory profit.",
  };
}

/**
 * Percentage change against a prior value, measured against |previous| so the
 * direction stays truthful when the prior period was a loss.
 * Null when there is no meaningful base (previous = 0).
 */
export function percentChange(current: Money, previous: Money): Decimal | null {
  if (previous.isZero()) {
    return null;
  }
  return current.toMajor().sub(previous.toMajor()).div(previous.toMajor().abs()).mul(100);
}

/** Difference in percentage points between two rates (e.g. margins). */
export function percentagePointChange(current: Decimal | null, previous: Decimal | null): Decimal | null {
  if (current === null || previous === null) return null;
  return current.sub(previous);
}

export function settlementDifference(args: { expected: Money; actual: Money }): Money {
  return args.actual.sub(args.expected);
}

export function availableStock(args: { onHand: number; reserved: number }): number {
  return args.onHand - args.reserved;
}

/** Value of sellable stock. Negative availability (oversold) contributes zero value. */
export function inventoryValue(args: { sellableUnits: number; unitCost: Money | null }): Money | null {
  if (!args.unitCost) {
    return null;
  }
  return args.unitCost.mul(Math.max(0, args.sellableUnits));
}

/** Unit-level return rate: returned units ÷ sold units × 100. */
export function returnRate(args: { returnedUnits: number; soldUnits: number }): Decimal | null {
  if (args.soldUnits <= 0) {
    return null;
  }
  return new Decimal(args.returnedUnits).div(args.soldUnits).mul(100);
}

export function roas(args: { attributedSales: Money; spend: Money }): Decimal | null {
  if (args.spend.isZero()) {
    return null;
  }
  return args.attributedSales.toMajor().div(args.spend.toMajor());
}

export function acos(args: { spend: Money; attributedSales: Money }): Decimal | null {
  if (args.attributedSales.isZero()) {
    return null;
  }
  return args.spend.toMajor().div(args.attributedSales.toMajor()).mul(100);
}

export const MIN_ORDERS_FOR_VELOCITY = 3;

export type SalesVelocity =
  | { kind: "known"; unitsPerDay: Decimal; orders: number; windowDays: number }
  | { kind: "insufficient"; orders: number; windowDays: number };

/** Average daily units sold over a window. Requires a minimum order count. */
export function salesVelocity(args: { unitsSold: number; orders: number; windowDays: number }): SalesVelocity {
  if (args.windowDays <= 0 || args.orders < MIN_ORDERS_FOR_VELOCITY || args.unitsSold <= 0) {
    return { kind: "insufficient", orders: args.orders, windowDays: args.windowDays };
  }
  return {
    kind: "known",
    unitsPerDay: new Decimal(args.unitsSold).div(args.windowDays),
    orders: args.orders,
    windowDays: args.windowDays,
  };
}

export function daysOfStockRemaining(args: { available: number; averageDailyUnits: Decimal | null }): Decimal | null {
  if (!args.averageDailyUnits || args.averageDailyUnits.lte(0)) {
    return null;
  }
  return new Decimal(Math.max(0, args.available)).div(args.averageDailyUnits);
}

/**
 * Split `total` across parts in proportion to `weights`, using the largest-remainder
 * method so the parts always sum exactly to `total` in minor units.
 */
export function allocateProportionally(total: Money, weights: Money[]): Money[] {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((sum, w) => sum.add(w), Money.zero(total.currency));
  if (weightSum.isZero()) {
    const equal = weights.map(() => Money.fromMinor(1, total.currency));
    return allocateProportionally(total, equal);
  }
  const raw = weights.map((w) => total.minor.mul(w.minor).div(weightSum.minor));
  const floors = raw.map((r) => r.floor());
  let remainder = total.minor.sub(floors.reduce((sum, f) => sum.add(f), new Decimal(0)));
  const order = raw
    .map((r, index) => ({ index, fraction: r.sub(r.floor()) }))
    .sort((a, b) => b.fraction.cmp(a.fraction) || a.index - b.index);
  const result = [...floors];
  for (const { index } of order) {
    if (remainder.lte(0)) break;
    result[index] = (result[index] ?? new Decimal(0)).add(1);
    remainder = remainder.sub(1);
  }
  return result.map((minor) => Money.fromMinor(minor, total.currency));
}

/**
 * Estimated contribution of selling one unit on a channel, before advertising and
 * returns: price − unit cost − commission − fixed fee − shipping. This is a
 * forward-looking estimate, distinct from realised net profit.
 */
export function estimatedUnitContribution(args: {
  sellingPrice: Money;
  unitCost: Money | null;
  commissionBps: number;
  fixedFee: Money;
  shippingPerOrder: Money;
}): Money | null {
  if (!args.unitCost) return null;
  const commission = args.sellingPrice.mul(new Decimal(args.commissionBps).div(10_000));
  return args.sellingPrice.sub(args.unitCost).sub(commission).sub(args.fixedFee).sub(args.shippingPerOrder);
}
