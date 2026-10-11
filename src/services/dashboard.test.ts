import { describe, expect, it } from "vitest";
import { buildDemoDataset, demoDataset } from "@/data/demo/seed";
import { MARKETPLACES, type DemoDataset } from "@/data/demo/types";
import { formatInr, Money } from "@/domain/money";
import { dayKeyOf } from "@/lib/dates";
import { NAV_ITEMS } from "@/lib/navigation";
import { parseGlobalFilters } from "@/lib/search-params";
import { getDashboardModel } from "./dashboard";
import { getLedger, profitFor } from "./ledger";
import { getProductPerformance } from "./products";
import { buildReport, REPORT_IDS } from "./reports";

const today = demoDataset.workspace.today;
const filters = (range: string, marketplace?: string) => parseGlobalFilters({ range, marketplace }, today);

function kpi(model: ReturnType<typeof getDashboardModel>, id: string) {
  const found = model.kpis.find((k) => k.id === id);
  if (!found) throw new Error(`missing KPI ${id}`);
  return found;
}

describe("demo dataset", () => {
  it("is reproducible from its seed", () => {
    expect(JSON.stringify(buildDemoDataset())).toBe(JSON.stringify(buildDemoDataset()));
  });

  it("has the shape the product spec asks for", () => {
    expect(demoDataset.workspace.name).toBe("Acme Commerce India");
    expect(demoDataset.products).toHaveLength(25);
    expect(demoDataset.orders.length).toBeGreaterThanOrEqual(100);
    expect(demoDataset.orders.length).toBeLessThanOrEqual(200);
    expect(demoDataset.returns.length).toBeGreaterThanOrEqual(20);
    expect(new Set(demoDataset.orders.map((o) => o.marketplace))).toEqual(new Set(MARKETPLACES));
    expect(demoDataset.settlements.some((s) => s.status === "NEEDS_REVIEW")).toBe(true);
  });
});

describe("dashboard is derived from records, not hardcoded", () => {
  it("net sales equals an independent recomputation from raw orders", () => {
    const f = filters("30d");
    let paise = 0;
    for (const order of demoDataset.orders) {
      const day = dayKeyOf(order.orderedAt);
      if (day < f.range.startDay || day > f.range.endDay || order.status === "CANCELLED") continue;
      for (const item of order.items) paise += item.unitPricePaise * item.quantity - item.discountPaise;
    }
    expect(kpi(getDashboardModel(f), "net-sales").exactValue).toBe(formatInr(Money.fromMinor(paise)));
  });

  it("responds to the data: an empty dataset shows zero sales and an undefined margin", () => {
    const empty: DemoDataset = { ...demoDataset, orders: [], returns: [], advertising: [], expenses: [], settlements: [] };
    const model = getDashboardModel(filters("30d"), empty);
    expect(kpi(model, "net-sales").value).toBe("₹0");
    expect(kpi(model, "net-margin").value).toBe("—");
    expect(kpi(model, "settlement-pending").value).toBe("₹0");
    expect(model.insights.every((i) => i.type === "stockout-risk" || i.type === "below-reorder-point")).toBe(true);
  });

  it("filters change the figures", () => {
    const all = kpi(getDashboardModel(filters("30d")), "net-sales").value;
    const amazon = kpi(getDashboardModel(filters("30d", "AMAZON")), "net-sales").value;
    const week = kpi(getDashboardModel(filters("7d")), "net-sales").value;
    expect(new Set([all, amazon, week]).size).toBe(3);
  });

  it("never fabricates a comparison when the prior period predates history", () => {
    const model = getDashboardModel(filters("90d"));
    for (const id of ["net-sales", "gross-profit", "net-profit", "net-margin"]) {
      expect(kpi(model, id).delta?.kind).toBe("unavailable");
    }
    expect(model.comparisonLabel).toBeNull();
    expect(kpi(getDashboardModel(filters("30d")), "net-sales").delta?.kind).toBe("change");
  });
});

describe("totals reconcile across views", () => {
  const ledger = getLedger(demoDataset);
  const f = filters("30d");

  it("marketplace rows plus shared overhead equal the workspace total", () => {
    const total = profitFor(ledger, { range: f.range, marketplace: "ALL" });
    const channels = MARKETPLACES.map((m) => profitFor(ledger, { range: f.range, marketplace: m }));
    const sales = channels.reduce((s, p) => s.add(p.netSales), Money.zero());
    expect(sales.cmp(total.netSales)).toBe(0);
    const overhead = demoDataset.expenses
      .filter((e) => e.marketplace === null && e.date >= f.range.startDay && e.date <= f.range.endDay)
      .reduce((s, e) => s.add(Money.fromMinor(e.amountPaise)), Money.zero());
    const profit = channels.reduce((s, p) => s.add(p.operatingNetProfit ?? Money.zero()), Money.zero()).sub(overhead);
    expect(profit.cmp(total.operatingNetProfit ?? Money.zero())).toBe(0);
  });

  it("product net profit minus unallocated expenses equals workspace net profit", () => {
    const products = getProductPerformance({ range: f.range, marketplace: "ALL" });
    const productTotal = products.reduce((s, p) => s.add(p.profit.operatingNetProfit ?? Money.zero()), Money.zero());
    const total = profitFor(ledger, { range: f.range, marketplace: "ALL" });
    expect(productTotal.sub(total.otherOperatingExpenses).cmp(total.operatingNetProfit ?? Money.zero())).toBe(0);
  });

  it("the P&L export matches the dashboard", () => {
    const report = buildReport("pnl", f);
    const netProfitRow = report.rows.find((r) => r[0] === "Net profit");
    const total = profitFor(ledger, { range: f.range, marketplace: "ALL" });
    expect(netProfitRow?.[1]).toBe(total.operatingNetProfit?.toMajor().toFixed(2));
  });

  it("every report builds", () => {
    for (const id of REPORT_IDS) expect(buildReport(id, f).headers.length).toBeGreaterThan(1);
  });
});

describe("insights", () => {
  const model = getDashboardModel(filters("30d"));

  it("fires deterministic rules on the demo data", () => {
    const types = new Set(model.insights.map((i) => i.type));
    expect(types.has("negative-profit-after-ads")).toBe(true);
    expect(types.has("settlement-discrepancy")).toBe(true);
    expect(types.has("high-return-rate")).toBe(true);
    expect(types.has("stockout-risk")).toBe(true);
  });

  it("links every insight to a real section", () => {
    const routes = new Set(NAV_ITEMS.map((n) => n.href));
    for (const insight of model.insights) {
      expect(routes.has(insight.href.split("?")[0] ?? "")).toBe(true);
    }
  });
});
