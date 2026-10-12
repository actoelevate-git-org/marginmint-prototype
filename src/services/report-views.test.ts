import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { parseGlobalFilters } from "@/lib/search-params";
import { formatCell, getReportView, REPORT_SHAPES, reportRows } from "./report-views";
import { buildReport, REPORT_IDS } from "./reports";

const today = demoDataset.workspace.today;
const f30 = parseGlobalFilters({ range: "30d" }, today);
const f90 = parseGlobalFilters({ range: "90d" }, today);

describe("report viewer", () => {
  it("defines a type for every column of every report", () => {
    for (const id of REPORT_IDS) {
      expect(REPORT_SHAPES[id].types.length, id).toBe(buildReport(id, f30).headers.length);
      for (const index of REPORT_SHAPES[id].totals) expect(["money", "number"]).toContain(REPORT_SHAPES[id].types[index]);
    }
  });

  it("shows exactly the same rows as the CSV export, across all pages", () => {
    for (const id of REPORT_IDS) {
      const csv = buildReport(id, f90);
      const first = getReportView(id, { filters: f90, page: 1 });
      expect(first.rowCount, id).toBe(csv.rows.length);
      let shown = 0;
      for (let page = 1; page <= first.pageCount; page += 1) shown += getReportView(id, { filters: f90, page }).rows.length;
      expect(shown, id).toBe(csv.rows.length);
      expect(first.columns.map((c) => c.header)).toEqual(csv.headers);
    }
  });

  it("totals equal the decimal-exact sum of each summable column", () => {
    for (const id of REPORT_IDS) {
      const view = getReportView(id, { filters: f90, page: 1 });
      const rows = reportRows(id, f90);
      const shape = REPORT_SHAPES[id];
      if (!shape.totals.length) {
        expect(view.totals).toBeNull();
        continue;
      }
      for (const index of shape.totals) {
        const exact = rows.reduce((t, r) => t.add(/^-?\d+(\.\d+)?$/.test(String(r[index] ?? "")) ? new Decimal(String(r[index])) : 0), new Decimal(0));
        expect(view.totals?.[index], `${id} column ${index}`).toBe(formatCell(exact.toFixed(2), shape.types[index] ?? "money"));
      }
    }
  });

  it("sorts by any column in both directions and paginates 50 rows per page", () => {
    const desc = getReportView("orders", { filters: f90, sort: { column: 8, dir: "desc" }, page: 1 });
    const values = reportRows("orders", f90).map((r) => Number(r[8])).sort((a, b) => b - a);
    expect(desc.rows[0]?.[8]?.text).toBe(formatCell(values[0]?.toFixed(2), "money"));
    expect(desc.rows.length).toBe(50);
    expect(desc.pageCount).toBe(Math.ceil(values.length / 50));
    const asc = getReportView("orders", { filters: f90, sort: { column: 8, dir: "asc" }, page: 1 });
    expect(asc.rows[0]?.[8]?.text).toBe(formatCell(values.at(-1)?.toFixed(2), "money"));
    const text = getReportView("product-profitability", { filters: f30, sort: { column: 1, dir: "asc" }, page: 1 }).rows.map((r) => r[1]?.text ?? "");
    expect(text).toEqual([...text].sort((a, b) => a.localeCompare(b, "en-IN", { numeric: true })));
    expect(getReportView("orders", { filters: f90, page: 999 }).page).toBe(desc.pageCount);
    expect(getReportView("orders", { filters: f90, sort: { column: 99, dir: "asc" }, page: 1 }).sort).toEqual(REPORT_SHAPES.orders.defaultSort);
  });

  it("P&L view matches the dashboard and keeps statement order", () => {
    const view = getReportView("pnl", { filters: f30, page: 1 });
    expect(view.pnl).not.toBeNull();
    expect(view.rows[0]?.[0]?.text).toBe("Gross item sales");
    const netProfitTile = view.tiles.find((t) => t.label === "Net profit");
    const kpi = view.pnl?.kpis.find((k) => k.id === "net-profit");
    expect(netProfitTile?.value).toBe(kpi?.value);
    const marginRow = view.rows.find((r) => r[0]?.text === "Net profit margin %");
    expect(marginRow?.[1]?.text).toMatch(/%$/);
  });

  it("provides summary tiles and a numeric chart for every other report", () => {
    for (const id of REPORT_IDS.filter((r) => r !== "pnl")) {
      const view = getReportView(id, { filters: f90, page: 1 });
      expect(view.tiles.length, id).toBeGreaterThanOrEqual(3);
      expect(view.chart, id).not.toBeNull();
      for (const point of view.chart?.data ?? []) {
        for (const series of view.chart?.series ?? []) {
          const v = point[series.key];
          expect(v === null || typeof v === "number", `${id} ${series.key}`).toBe(true);
        }
      }
    }
  });

  it("flags negative values for red styling and formats each column type", () => {
    const losses = getReportView("product-profitability", { filters: f30, sort: { column: 12, dir: "asc" }, page: 1 });
    expect(losses.rows[0]?.[12]?.negative).toBe(true);
    expect(formatCell("-1250.5", "money")).toBe("−₹1,250.50");
    expect(formatCell("17.05", "percent")).toBe("17.1%");
    expect(formatCell("2026-10-11", "date")).toBe("11 Oct 2026");
    expect(formatCell("NEEDS_REVIEW", "status")).toBe("Needs review");
    expect(formatCell("", "money")).toBe("—");
    expect(formatCell("Insufficient sales history", "decimal")).toBe("Insufficient sales history");
  });

  it("handles an empty period without totals or charts that pretend to have data", () => {
    const empty: DemoDataset = { ...demoDataset, orders: [], returns: [], advertising: [], settlements: [], expenses: [] };
    for (const id of ["orders", "returns", "advertising", "settlements"] as const) {
      const view = getReportView(id, { filters: f30, page: 1 }, empty);
      expect(view.rowCount, id).toBe(0);
      expect(view.totals, id).toBeNull();
    }
    expect(getReportView("returns", { filters: f30, page: 1 }, empty).chart).toBeNull();
  });

  it("explains when a filter does not apply", () => {
    expect(getReportView("inventory-valuation", { filters: f30, page: 1 }).rangeNote).toMatch(/snapshot/);
    expect(getReportView("marketplace-performance", { filters: f30, page: 1 }).rangeNote).toMatch(/marketplace filter/);
    expect(getReportView("orders", { filters: f30, page: 1 }).rangeNote).toBeNull();
  });
});
