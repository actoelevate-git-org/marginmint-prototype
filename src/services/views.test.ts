import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo/seed";
import { Money } from "@/domain/money";
import { dayKeyOf } from "@/lib/dates";
import { parseGlobalFilters } from "@/lib/search-params";
import { aggregateCampaigns, getAdvertisingView } from "./advertising";
import { getInventoryView } from "./inventory";
import { getOrderDetail, listOrders } from "./orders";
import { getProfitabilityView } from "./profitability";
import { getReturnsView } from "./returns";
import { getSettlementsView, pendingPayouts, reviewDiscrepancies } from "./settlements";

const today = demoDataset.workspace.today;
const f30 = parseGlobalFilters({ range: "30d" }, today);
const rupees = (text: string) => Number(text.replace(/[^\d.−-]/g, "").replace("−", "-"));

describe("orders view", () => {
  const base = { ...f30, status: "ALL" as const, q: "", sort: { key: "date" as const, dir: "desc" as const }, page: 1 };

  it("counts every order in range and paginates 25 at a time", () => {
    const expected = demoDataset.orders.filter((o) => dayKeyOf(o.orderedAt) >= f30.range.startDay && dayKeyOf(o.orderedAt) <= f30.range.endDay).length;
    const page = listOrders(base);
    expect(page.total).toBe(expected);
    expect(page.statusCounts.ALL).toBe(expected);
    expect(page.rows.length).toBe(Math.min(25, expected));
    expect(listOrders({ ...base, page: 999 }).page).toBe(page.pageCount);
  });

  it("filters by status, marketplace and search", () => {
    const delivered = listOrders({ ...base, status: "DELIVERED" });
    expect(delivered.rows.every((r) => r.status === "DELIVERED")).toBe(true);
    const amazon = listOrders({ ...base, marketplace: "AMAZON" });
    expect(amazon.rows.every((r) => r.marketplace === "Amazon India")).toBe(true);
    const first = listOrders(base).rows[0];
    expect(listOrders({ ...base, q: first?.id ?? "" }).rows.map((r) => r.id)).toContain(first?.id);
    expect(listOrders({ ...base, q: "no-such-order" }).total).toBe(0);
  });

  it("sorts by value in both directions", () => {
    const desc = listOrders({ ...base, sort: { key: "value", dir: "desc" } }).rows.map((r) => rupees(r.value));
    const asc = listOrders({ ...base, sort: { key: "value", dir: "asc" } }).rows.map((r) => rupees(r.value));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });

  it("order detail shows lines, settlements and a profit chain that adds up", () => {
    const order = demoDataset.orders.find((o) => o.status === "DELIVERED" && o.items.length === 1);
    const detail = order ? getOrderDetail(order.id) : null;
    expect(detail?.lines).toHaveLength(1);
    const row = (label: string) => detail?.profit.find((p) => p.label === label)?.value ?? "";
    const net = rupees(row("Net sales"));
    const contribution = rupees(row("Contribution profit"));
    const costs = ["Cost of goods sold", "Marketplace fees", "Shipping & fulfilment"].reduce((s, l) => s + rupees(row(l)), 0);
    expect(contribution).toBeCloseTo(net + costs, 2);
    expect(getOrderDetail("does-not-exist")).toBeNull();
  });
});

describe("inventory view", () => {
  const view = getInventoryView({ view: "all", q: "", sort: { key: "cover", dir: "asc" }, page: 1 });

  it("covers every product and classifies stock status from reorder points", () => {
    expect(view.summary.skus).toBe(demoDataset.products.length);
    const low = demoDataset.products.filter((p) => p.onHand - p.reserved <= p.reorderThreshold && p.onHand - p.reserved > 0).length;
    expect(view.summary.low).toBe(low);
    const restock = getInventoryView({ view: "low", q: "", sort: { key: "name", dir: "asc" }, page: 1 });
    expect(restock.page.rows.every((r) => r.status !== "healthy")).toBe(true);
  });

  it("never invents a forecast without enough sales history", () => {
    for (const row of view.page.rows) {
      if (row.cover === "Insufficient history") expect(row.coverNote).toMatch(/Fewer than 3 orders/);
      else expect(row.cover).toMatch(/^\d+ days$/);
    }
  });

  it("searches by SKU", () => {
    const hit = getInventoryView({ view: "all", q: "MM-104", sort: { key: "name", dir: "asc" }, page: 1 });
    expect(hit.page.rows.map((r) => r.sku)).toEqual(["MM-104"]);
  });
});

describe("settlements view", () => {
  const view = getSettlementsView({ ...f30, status: "ALL", q: "", sort: { key: "date", dir: "desc" }, page: 1 });

  it("status counts add up to the transaction count", () => {
    const sum = Object.values(view.statusCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(view.summary.transactionCount);
  });

  it("shows awaiting payouts as not received and signs differences actual − expected", () => {
    const review = getSettlementsView({ ...f30, status: "NEEDS_REVIEW", q: "", sort: { key: "difference", dir: "asc" }, page: 1 });
    expect(review.page.rows.every((r) => r.status === "NEEDS_REVIEW" && r.received)).toBe(true);
    expect(review.page.rows.some((r) => r.differenceKind === "under")).toBe(true);
    const awaiting = getSettlementsView({ ...f30, status: "UNMATCHED", q: "", sort: { key: "date", dir: "desc" }, page: 1 });
    expect(awaiting.page.rows.every((r) => r.actual === "Not received" && r.differenceKind === "pending")).toBe(true);
  });

  it("pending payouts and review discrepancies are consistent across marketplaces", () => {
    const all = pendingPayouts("ALL");
    const byChannel = (["AMAZON", "FLIPKART", "SHOPIFY", "D2C"] as const).map((m) => pendingPayouts(m));
    expect(byChannel.reduce((s, p) => s.add(p.amount), Money.zero()).cmp(all.amount)).toBe(0);
    expect(byChannel.reduce((n, p) => n + p.count, 0)).toBe(all.count);
    const review = reviewDiscrepancies("ALL");
    expect(review.absoluteDifference.cmp(review.netDifference.abs())).toBeGreaterThanOrEqual(0);
  });
});

describe("returns view", () => {
  it("uses unit-level return rate and lists reasons summing to returned units", () => {
    const view = getReturnsView({ filters: f30, q: "", page: 1 });
    const reasonUnits = view.reasons.reduce((n, r) => n + r.units, 0);
    expect(reasonUnits).toBe(view.summary.returnedUnits);
    const expectedRate = ((view.summary.returnedUnits / view.summary.soldUnits) * 100).toFixed(1);
    expect(view.summary.returnRate).toBe(`${expectedRate}%`);
    expect(getReturnsView({ filters: f30, q: "no-such-sku", page: 1 }).page.total).toBe(0);
  });
});

describe("advertising view", () => {
  it("campaign totals reconcile and ROAS/ACOS follow their definitions", () => {
    const { campaigns, total } = aggregateCampaigns(f30);
    expect(campaigns.reduce((s, c) => s.add(c.spend), Money.zero()).cmp(total.spend)).toBe(0);
    for (const c of campaigns) {
      if (c.roas && c.acos) expect(c.roas.mul(c.acos).toDecimalPlaces(6).toNumber()).toBeCloseTo(100, 4);
    }
    const view = getAdvertisingView({ filters: f30, q: "", sort: { key: "roas", dir: "asc" } });
    expect(view.rows.some((r) => r.unprofitable)).toBe(true);
  });
});

describe("profitability view", () => {
  it("sort presets order rows correctly and 'losses' only shows losses", () => {
    const losses = getProfitabilityView({ filters: f30, q: "", sort: "losses" });
    expect(losses.rows.every((r) => r.netProfitNegative)).toBe(true);
    const top = getProfitabilityView({ filters: f30, q: "", sort: "profit-desc" }).rows.filter((r) => r.netProfit !== "Unknown");
    const values = top.map((r) => rupees(r.netProfit));
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(getProfitabilityView({ filters: f30, q: "MM-104", sort: "profit-desc" }).rows.map((r) => r.sku)).toEqual(["MM-104"]);
  });
});
