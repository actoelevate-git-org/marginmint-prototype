import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { generateInsights, type ProductSignal, type WorkspaceSignal } from "./insights";
import { Money } from "./money";

const rs = (n: number) => Money.fromMajor(n);

function product(overrides: Partial<ProductSignal> = {}): ProductSignal {
  return {
    productId: "p1",
    sku: "MM-001",
    name: "Widget",
    netSales: rs(10_000),
    advertising: rs(0),
    profitBeforeAds: rs(2_000),
    netProfit: rs(2_000),
    netMargin: new Decimal(20),
    soldUnits: 20,
    returnedUnits: 1,
    returnRate: new Decimal(5),
    available: 100,
    reorderThreshold: 10,
    velocity: { kind: "known", unitsPerDay: new Decimal(1), orders: 10, windowDays: 30 },
    daysOfCover: new Decimal(100),
    ...overrides,
  };
}

const quietWorkspace: WorkspaceSignal = {
  settlementsNeedingReview: { count: 0, netDifference: Money.zero(), absoluteDifference: Money.zero() },
  adSpend: { current: rs(1000), previous: rs(1000) },
  netSales: { current: rs(10_000), previous: rs(10_000) },
};

describe("generateInsights", () => {
  it("emits nothing when every signal is healthy", () => {
    expect(generateInsights({ products: [product()], workspace: quietWorkspace })).toEqual([]);
  });

  it("flags a stock-out risk only from known sales velocity", () => {
    const [insight] = generateInsights({
      products: [product({ available: 5, daysOfCover: new Decimal(5) })],
      workspace: quietWorkspace,
    });
    expect(insight?.type).toBe("stockout-risk");
    expect(insight?.severity).toBe("critical");
    expect(insight?.title).toContain("5 days");
  });

  it("does not invent a forecast when sales history is insufficient", () => {
    const [insight] = generateInsights({
      products: [product({ available: 3, velocity: { kind: "insufficient", orders: 1, windowDays: 30 }, daysOfCover: null })],
      workspace: quietWorkspace,
    });
    expect(insight?.type).toBe("below-reorder-point");
    expect(insight?.evidence).toContain("Insufficient sales history");
  });

  it("flags products that lose money only because of advertising", () => {
    const insights = generateInsights({
      products: [product({ advertising: rs(3_000), profitBeforeAds: rs(2_000), netProfit: rs(-1_000), netMargin: new Decimal(-10) })],
      workspace: quietWorkspace,
    });
    expect(insights.map((i) => i.type)).toContain("negative-profit-after-ads");
    expect(insights[0]?.evidence).toContain("₹1,000");
  });

  it("ignores immaterial losses", () => {
    const insights = generateInsights({
      products: [product({ advertising: rs(900), profitBeforeAds: rs(893), netProfit: rs(-7), netMargin: new Decimal(-0.1) })],
      workspace: quietWorkspace,
    });
    expect(insights).toEqual([]);
  });

  it("does not blame advertising when there was no ad spend", () => {
    const insights = generateInsights({
      products: [product({ advertising: rs(0), profitBeforeAds: rs(-500), netProfit: rs(-500), netMargin: new Decimal(-5) })],
      workspace: quietWorkspace,
    });
    expect(insights.map((i) => i.type)).not.toContain("negative-profit-after-ads");
  });

  it("requires a minimum sample before flagging return rates", () => {
    const small = generateInsights({ products: [product({ soldUnits: 2, returnedUnits: 1, returnRate: new Decimal(50) })], workspace: quietWorkspace });
    expect(small).toEqual([]);
    const large = generateInsights({ products: [product({ soldUnits: 20, returnedUnits: 6, returnRate: new Decimal(30) })], workspace: quietWorkspace });
    expect(large[0]?.type).toBe("high-return-rate");
  });

  it("reports settlement discrepancies with the signed net difference", () => {
    const [insight] = generateInsights({
      products: [],
      workspace: { ...quietWorkspace, settlementsNeedingReview: { count: 2, netDifference: rs(-300), absoluteDifference: rs(500) } },
    });
    expect(insight?.type).toBe("settlement-discrepancy");
    expect(insight?.title).toContain("₹500");
    expect(insight?.evidence).toContain("−₹300");
  });

  it("only compares ad spend with sales when the prior period exists", () => {
    const rising = { ...quietWorkspace, adSpend: { current: rs(1500), previous: rs(1000) }, netSales: { current: rs(10_100), previous: rs(10_000) } };
    expect(generateInsights({ products: [], workspace: rising })[0]?.type).toBe("ad-spend-outpacing-sales");
    const noHistory = { ...rising, adSpend: { current: rs(1500), previous: null } };
    expect(generateInsights({ products: [], workspace: noHistory })).toEqual([]);
  });

  it("orders by severity and never duplicates an insight id", () => {
    const insights = generateInsights({
      products: [
        product({ productId: "a", available: 2, daysOfCover: new Decimal(2) }),
        product({ productId: "b", soldUnits: 20, returnRate: new Decimal(40), returnedUnits: 8 }),
      ],
      workspace: { ...quietWorkspace, settlementsNeedingReview: { count: 1, netDifference: rs(-10), absoluteDifference: rs(10) } },
    });
    expect(insights[0]?.severity).toBe("critical");
    expect(new Set(insights.map((i) => i.id)).size).toBe(insights.length);
  });
});
