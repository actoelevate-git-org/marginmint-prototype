import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import {
  acos,
  allocateProportionally,
  availableStock,
  computeProfitBreakdown,
  daysOfStockRemaining,
  estimatedUnitContribution,
  inventoryValue,
  netProfitMargin,
  netSales,
  percentagePointChange,
  percentChange,
  returnRate,
  roas,
  salesVelocity,
  settlementDifference,
  type ProfitInputs,
} from "./finance";
import { Money } from "./money";

const rs = (major: string | number) => Money.fromMajor(major);

function inputs(overrides: Partial<ProfitInputs> = {}): ProfitInputs {
  return {
    grossItemSales: rs(10_000),
    discounts: rs(500),
    cancelledItemValue: rs(1_000),
    cogs: rs(4_000),
    variableFees: rs(1_200),
    fulfillmentAndShipping: rs(300),
    otherVariableCosts: rs(0),
    advertising: rs(800),
    otherOperatingExpenses: rs(200),
    refundAndReturnLosses: rs(400),
    ...overrides,
  };
}

describe("profit formulas", () => {
  it("computes the full chain from net sales to net profit", () => {
    const p = computeProfitBreakdown(inputs());
    expect(p.netSales.toMajor().toString()).toBe("8500");
    expect(p.grossProfit?.toMajor().toString()).toBe("4500");
    expect(p.contributionProfit?.toMajor().toString()).toBe("3000");
    expect(p.operatingNetProfit?.toMajor().toString()).toBe("1600");
    expect(p.netProfitMargin?.toDecimalPlaces(4).toString()).toBe("18.8235");
    expect(p.coverage).toBe("estimated");
  });

  it("treats missing COGS as unknown, not zero", () => {
    const p = computeProfitBreakdown(inputs({ cogs: null }));
    expect(p.netSales.toMajor().toString()).toBe("8500");
    expect(p.grossProfit).toBeNull();
    expect(p.contributionProfit).toBeNull();
    expect(p.operatingNetProfit).toBeNull();
    expect(p.netProfitMargin).toBeNull();
    expect(p.coverage).toBe("incomplete");
  });

  it("supports negative profit", () => {
    const p = computeProfitBreakdown(inputs({ advertising: rs(5_000) }));
    expect(p.operatingNetProfit?.toMajor().toString()).toBe("-2600");
    expect(p.netProfitMargin?.isNegative()).toBe(true);
  });

  it("returns a null margin for zero or negative net sales", () => {
    expect(netProfitMargin(rs(100), Money.zero())).toBeNull();
    expect(netProfitMargin(rs(-100), rs(-50))).toBeNull();
    const p = computeProfitBreakdown(inputs({ grossItemSales: rs(0), discounts: rs(0), cancelledItemValue: rs(0) }));
    expect(p.netProfitMargin).toBeNull();
  });

  it("net sales subtracts discounts and cancellations once each", () => {
    expect(netSales({ grossItemSales: rs(1000), discounts: rs(100), cancelledItemValue: rs(200) }).toMajor().toString()).toBe("700");
  });
});

describe("comparisons", () => {
  it("returns null percent change when the prior value is zero", () => {
    expect(percentChange(rs(100), Money.zero())).toBeNull();
  });

  it("measures change against |previous| so a smaller loss reads as an improvement", () => {
    expect(percentChange(rs(-50), rs(-100))?.toString()).toBe("50");
    expect(percentChange(rs(50), rs(-100))?.toString()).toBe("150");
    expect(percentChange(rs(90), rs(100))?.toString()).toBe("-10");
  });

  it("computes percentage-point change and handles unknowns", () => {
    expect(percentagePointChange(new Decimal(12), new Decimal(10))?.toString()).toBe("2");
    expect(percentagePointChange(null, new Decimal(10))).toBeNull();
  });
});

describe("settlement difference", () => {
  it("is actual − expected: negative = underpaid, positive = overpaid", () => {
    expect(settlementDifference({ expected: rs(1000), actual: rs(950) }).toMajor().toString()).toBe("-50");
    expect(settlementDifference({ expected: rs(1000), actual: rs(1010.5) }).toMajor().toString()).toBe("10.5");
  });
});

describe("inventory", () => {
  it("computes available stock and its value", () => {
    expect(availableStock({ onHand: 10, reserved: 3 })).toBe(7);
    expect(inventoryValue({ sellableUnits: 7, unitCost: rs(250) })?.toMajor().toString()).toBe("1750");
  });

  it("values oversold (negative) availability at zero and unknown cost as unknown", () => {
    expect(inventoryValue({ sellableUnits: -2, unitCost: rs(250) })?.isZero()).toBe(true);
    expect(inventoryValue({ sellableUnits: 5, unitCost: null })).toBeNull();
  });

  it("requires enough sales history before forecasting", () => {
    expect(salesVelocity({ unitsSold: 10, orders: 2, windowDays: 30 }).kind).toBe("insufficient");
    const v = salesVelocity({ unitsSold: 15, orders: 6, windowDays: 30 });
    expect(v.kind).toBe("known");
    if (v.kind === "known") {
      expect(v.unitsPerDay.toString()).toBe("0.5");
      expect(daysOfStockRemaining({ available: 5, averageDailyUnits: v.unitsPerDay })?.toString()).toBe("10");
    }
    expect(daysOfStockRemaining({ available: 5, averageDailyUnits: null })).toBeNull();
  });
});

describe("rates", () => {
  it("handles zero denominators", () => {
    expect(returnRate({ returnedUnits: 0, soldUnits: 0 })).toBeNull();
    expect(roas({ attributedSales: rs(100), spend: Money.zero() })).toBeNull();
    expect(acos({ spend: rs(100), attributedSales: Money.zero() })).toBeNull();
  });

  it("computes ROAS, ACOS and unit-level return rate", () => {
    expect(roas({ attributedSales: rs(300), spend: rs(100) })?.toString()).toBe("3");
    expect(acos({ spend: rs(100), attributedSales: rs(400) })?.toString()).toBe("25");
    expect(returnRate({ returnedUnits: 3, soldUnits: 20 })?.toString()).toBe("15");
  });
});

describe("allocateProportionally", () => {
  it("always sums exactly to the total", () => {
    const parts = allocateProportionally(Money.fromMinor(100), [Money.fromMinor(1), Money.fromMinor(1), Money.fromMinor(1)]);
    expect(parts.map((p) => p.minor.toNumber())).toEqual([34, 33, 33]);
    const shipping = allocateProportionally(Money.fromMinor(6500), [Money.fromMinor(129900), Money.fromMinor(39900)]);
    expect(shipping.reduce((s, p) => s.add(p), Money.zero()).minor.toNumber()).toBe(6500);
  });

  it("splits evenly when all weights are zero", () => {
    const parts = allocateProportionally(Money.fromMinor(10), [Money.zero(), Money.zero()]);
    expect(parts.map((p) => p.minor.toNumber())).toEqual([5, 5]);
  });
});

describe("estimatedUnitContribution", () => {
  it("subtracts cost, commission, fixed fee and shipping", () => {
    const value = estimatedUnitContribution({
      sellingPrice: rs(1299),
      unitCost: rs(720),
      commissionBps: 1800,
      fixedFee: rs(25),
      shippingPerOrder: rs(65),
    });
    expect(value?.toMajor().toString()).toBe("255.18");
  });

  it("is unknown without a unit cost", () => {
    expect(
      estimatedUnitContribution({ sellingPrice: rs(100), unitCost: null, commissionBps: 0, fixedFee: rs(0), shippingPerOrder: rs(0) }),
    ).toBeNull();
  });
});
