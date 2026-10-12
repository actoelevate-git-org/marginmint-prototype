import { Decimal } from "decimal.js";
import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { acos, roas } from "@/domain/finance";
import { formatInr, formatPercent, Money } from "@/domain/money";
import type { CsvValue } from "@/lib/csv";
import { describeRange, formatDayLong, formatDayShort } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { compareNullable } from "@/lib/pagination";
import { globalFilterQuery, type GlobalFilters, type SortDirection } from "@/lib/search-params";
import { getDashboardModel } from "./dashboard";
import { buildReport, REPORTS, type ReportDefinition, type ReportId } from "./reports";

/**
 * On-screen report viewer. Rows come from `buildReport` — the same function that
 * produces the CSV — so the table can never disagree with the download. This
 * module only adds column types (for formatting/sorting), decimal-exact totals,
 * summary tiles and chart data.
 */
export type ColumnType = "text" | "id" | "money" | "percent" | "number" | "decimal" | "date" | "status";

type ReportShape = {
  types: ColumnType[];
  /** Column indexes to sum in the totals row (only where adding up is meaningful). */
  totals: number[];
  defaultSort?: { column: number; dir: SortDirection };
};

const MONEY10: ColumnType[] = Array.from({ length: 10 }, () => "money");

export const REPORT_SHAPES: Record<ReportId, ReportShape> = {
  pnl: { types: ["text", "money"], totals: [] },
  "product-profitability": {
    types: ["id", "text", "number", ...MONEY10, "percent", "status"],
    totals: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    defaultSort: { column: 12, dir: "desc" },
  },
  "marketplace-performance": { types: ["text", "number", "money", "money", "percent", "percent", "money"], totals: [1, 2, 3, 6] },
  "inventory-valuation": {
    types: ["id", "text", "number", "number", "number", "number", "money", "money", "decimal", "decimal"],
    totals: [2, 3, 4, 7],
    defaultSort: { column: 7, dir: "desc" },
  },
  "low-stock": {
    types: ["id", "text", "number", "number", "number", "number", "money", "money", "decimal", "decimal"],
    totals: [2, 3, 4, 7],
    defaultSort: { column: 9, dir: "asc" },
  },
  settlements: { types: ["id", "text", "id", "date", "status", "money", "money", "money", "status", "text"], totals: [5, 6, 7], defaultSort: { column: 3, dir: "desc" } },
  returns: {
    types: ["id", "id", "text", "id", "number", "date", "text", "money", "money", "status", "money"],
    totals: [4, 7, 8, 10],
    defaultSort: { column: 5, dir: "desc" },
  },
  advertising: {
    types: ["text", "text", "id", "money", "money", "number", "number", "number", "decimal", "percent"],
    totals: [3, 4, 5, 6, 7],
    defaultSort: { column: 3, dir: "desc" },
  },
  orders: {
    types: ["id", "date", "text", "id", "text", "number", "money", "money", "money", "status", "status"],
    totals: [5, 6, 7, 8],
    defaultSort: { column: 1, dir: "desc" },
  },
};

const NUMERIC: ColumnType[] = ["money", "percent", "number", "decimal"];
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const PAGE_SIZE = 50;

function asDecimal(value: CsvValue): Decimal | null {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return PLAIN_NUMBER.test(text) ? new Decimal(text) : null;
}

/** Display formatting for one cell. Non-numeric text in numeric columns is shown as-is. */
export function formatCell(value: CsvValue, type: ColumnType): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (text === "") return "—";
  const d = asDecimal(text);
  switch (type) {
    case "money":
      return d ? formatInr(Money.fromMajor(d), { decimals: 2 }) : text;
    case "percent":
      return d ? formatPercent(d) : text;
    case "number":
      return d ? Number(d.toFixed(0)).toLocaleString("en-IN") : text;
    case "decimal":
      return d ? d.toDecimalPlaces(2).toString() : text;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatDayLong(text) : text;
    case "status":
      return text.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    default:
      return text;
  }
}

export type ReportCell = { text: string; negative: boolean };
export type ReportTile = { label: string; value: string; hint?: string; tone?: "default" | "negative" | "warning" };
export type ReportChartSeries = { key: string; label: string; color: "sales" | "gross" | "net" | "neutral" | "loss" };
export type ReportChart = {
  title: string;
  description: string;
  orientation: "horizontal" | "vertical";
  unit: "inr" | "count" | "days";
  /** Colour bars green/red by sign (single series only). */
  signColored: boolean;
  series: ReportChartSeries[];
  data: Record<string, string | number | null>[];
};

export type ReportView = {
  definition: ReportDefinition;
  scopeLabel: string;
  rangeNote: string | null;
  columns: { header: string; type: ColumnType; numeric: boolean }[];
  rows: ReportCell[][];
  totals: (string | null)[] | null;
  rowCount: number;
  page: number;
  pageCount: number;
  sort: { column: number; dir: SortDirection };
  tiles: ReportTile[];
  chart: ReportChart | null;
  /** P&L reuses the dashboard's waterfall and trend instead of a generic chart. */
  pnl: ReturnType<typeof getDashboardModel> | null;
  csvHref: string;
};

const num = (v: CsvValue): number | null => asDecimal(v)?.toNumber() ?? null;

function sumColumn(rows: CsvValue[][], index: number): Decimal {
  return rows.reduce((total, row) => total.add(asDecimal(row[index]) ?? 0), new Decimal(0));
}

function money(d: Decimal): string {
  return formatInr(Money.fromMajor(d), { decimals: 0 });
}

function tilesAndChart(id: ReportId, rows: CsvValue[][], filters: GlobalFilters): { tiles: ReportTile[]; chart: ReportChart | null } {
  const sum = (i: number) => sumColumn(rows, i);
  switch (id) {
    case "pnl":
      return { tiles: [], chart: null };
    case "product-profitability": {
      const withSales = rows.filter((r) => (asDecimal(r[2]) ?? new Decimal(0)).gt(0));
      const losers = rows.filter((r) => (asDecimal(r[12]) ?? new Decimal(0)).isNegative());
      const ranked = [...withSales].sort((a, b) => (asDecimal(b[12])?.cmp(asDecimal(a[12]) ?? 0) ?? 0));
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      return {
        tiles: [
          { label: "Products with sales", value: `${withSales.length} of ${rows.length}` },
          { label: "Loss-making products", value: String(losers.length), tone: losers.length ? "negative" : "default" },
          { label: "Most profitable", value: best ? String(best[1]) : "—", hint: best ? formatCell(best[12], "money") : undefined },
          { label: "Least profitable", value: worst ? String(worst[1]) : "—", hint: worst ? formatCell(worst[12], "money") : undefined, tone: "warning" },
        ],
        chart: {
          title: "Net profit by product",
          description: "Sorted from most to least profitable. Red bars lose money.",
          orientation: "horizontal",
          unit: "inr",
          signColored: true,
          series: [{ key: "value", label: "Net profit", color: "net" }],
          data: ranked.map((r) => ({ label: `${r[0]} ${r[1]}`, value: num(r[12]) })),
        },
      };
    }
    case "marketplace-performance": {
      const best = [...rows].sort((a, b) => (asDecimal(b[3])?.cmp(asDecimal(a[3]) ?? 0) ?? 0))[0];
      return {
        tiles: [
          { label: "Net sales", value: money(sum(2)) },
          { label: "Net profit (channels)", value: money(sum(3)), hint: "Before shared overhead" },
          { label: "Most profitable channel", value: best ? String(best[0]) : "—", hint: best ? formatCell(best[3], "money") : undefined },
          { label: "Pending settlement", value: money(sum(6)) },
        ],
        chart: {
          title: "Net sales and net profit by marketplace",
          description: "Shared overhead is excluded from channel profit.",
          orientation: "vertical",
          unit: "inr",
          signColored: false,
          series: [
            { key: "sales", label: "Net sales", color: "sales" },
            { key: "profit", label: "Net profit", color: "net" },
          ],
          data: rows.map((r) => ({ label: String(r[0]), sales: num(r[2]), profit: num(r[3]) })),
        },
      };
    }
    case "inventory-valuation":
    case "low-stock": {
      const out = rows.filter((r) => (asDecimal(r[4]) ?? new Decimal(0)).lte(0)).length;
      const noHistory = rows.filter((r) => !asDecimal(r[8])).length;
      const tiles: ReportTile[] =
        id === "inventory-valuation"
          ? [
              { label: "Inventory value", value: money(sum(7)) },
              { label: "Sellable units", value: Number(sum(4).toFixed(0)).toLocaleString("en-IN") },
              { label: "SKUs", value: String(rows.length) },
              { label: "Out of stock", value: String(out), tone: out ? "negative" : "default" },
            ]
          : [
              { label: "SKUs needing restock", value: String(rows.length), tone: rows.length ? "warning" : "default" },
              { label: "Out of stock", value: String(out), tone: out ? "negative" : "default" },
              { label: "Without enough sales history", value: String(noHistory), hint: "No forecast is invented" },
              { label: "Stock value at risk", value: money(sum(7)) },
            ];
      const chartRows = id === "inventory-valuation" ? [...rows].sort((a, b) => (asDecimal(b[7])?.cmp(asDecimal(a[7]) ?? 0) ?? 0)).slice(0, 12) : rows;
      return {
        tiles,
        chart:
          id === "inventory-valuation"
            ? {
                title: "Top 12 SKUs by inventory value",
                description: "Available units × unit cost.",
                orientation: "horizontal",
                unit: "inr",
                signColored: false,
                series: [{ key: "value", label: "Inventory value", color: "sales" }],
                data: chartRows.map((r) => ({ label: `${r[0]} ${r[1]}`, value: num(r[7]) })),
              }
            : rows.length
              ? {
                  title: "Available units vs reorder point",
                  description: "Restock when available falls to or below the reorder point.",
                  orientation: "horizontal",
                  unit: "count",
                  signColored: false,
                  series: [
                    { key: "available", label: "Available", color: "sales" },
                    { key: "reorder", label: "Reorder point", color: "neutral" },
                  ],
                  data: rows.map((r) => ({ label: `${r[0]} ${r[1]}`, available: num(r[4]), reorder: num(r[5]) })),
                }
              : null,
      };
    }
    case "settlements": {
      const review = rows.filter((r) => r[8] === "NEEDS_REVIEW").length;
      const diff = sum(7);
      const byStatus = new Map<string, number>();
      for (const r of rows) byStatus.set(String(r[8]), (byStatus.get(String(r[8])) ?? 0) + 1);
      return {
        tiles: [
          { label: "Expected", value: money(sum(5)) },
          { label: "Received", value: money(sum(6)) },
          { label: "Net difference", value: formatInr(Money.fromMajor(diff), { decimals: 0, signDisplay: "always" }), hint: "actual − expected", tone: diff.isNegative() ? "negative" : "default" },
          { label: "Needs review", value: String(review), tone: review ? "warning" : "default" },
        ],
        chart: {
          title: "Transactions by reconciliation status",
          description: "Count of settlement transactions in the period.",
          orientation: "vertical",
          unit: "count",
          signColored: false,
          series: [{ key: "value", label: "Transactions", color: "sales" }],
          data: [...byStatus.entries()].map(([status, count]) => ({ label: formatCell(status, "status"), value: count })),
        },
      };
    }
    case "returns": {
      const byReason = new Map<string, number>();
      for (const r of rows) byReason.set(String(r[6]), (byReason.get(String(r[6])) ?? 0) + (num(r[4]) ?? 0));
      return {
        tiles: [
          { label: "Returns", value: String(rows.length), hint: `${sum(4).toFixed(0)} units` },
          { label: "Refund value", value: money(sum(7)) },
          { label: "Return shipping", value: money(sum(8)) },
          { label: "Estimated loss", value: money(sum(10)), tone: "negative", hint: "Refund + shipping − stock recovered" },
        ],
        chart: rows.length
          ? {
              title: "Returned units by reason",
              description: "Where returns come from in this period.",
              orientation: "horizontal",
              unit: "count",
              signColored: false,
              series: [{ key: "value", label: "Units", color: "gross" }],
              data: [...byReason.entries()].sort((a, b) => b[1] - a[1]).map(([reason, units]) => ({ label: reason, value: units })),
            }
          : null,
      };
    }
    case "advertising": {
      const spend = Money.fromMajor(sum(3));
      const attributed = Money.fromMajor(sum(4));
      const r = roas({ attributedSales: attributed, spend });
      return {
        tiles: [
          { label: "Ad spend", value: money(sum(3)) },
          { label: "Attributed sales", value: money(sum(4)), hint: "Not necessarily incremental" },
          { label: "ROAS", value: r ? `${r.toDecimalPlaces(2).toFixed(2)}×` : "—" },
          { label: "ACOS", value: formatPercent(acos({ spend, attributedSales: attributed })) },
        ],
        chart: rows.length
          ? {
              title: "Spend vs attributed sales by campaign",
              description: "Campaigns where spend exceeds attributed sales lose money on ads alone.",
              orientation: "horizontal",
              unit: "inr",
              signColored: false,
              series: [
                { key: "spend", label: "Spend", color: "gross" },
                { key: "sales", label: "Attributed sales", color: "sales" },
              ],
              data: rows.map((row) => ({ label: String(row[0]).replace(/^SP · /, "").replace(/ · Exact$/, ""), spend: num(row[3]), sales: num(row[4]) })),
            }
          : null,
      };
    }
    case "orders": {
      const cancelled = rows.filter((r) => r[9] === "CANCELLED").length;
      const perDay = new Map<string, number>();
      for (const r of rows) perDay.set(String(r[1]), (perDay.get(String(r[1])) ?? 0) + 1);
      const days = [...perDay.keys()].sort();
      return {
        tiles: [
          { label: "Orders", value: String(rows.length) },
          { label: "Units", value: Number(sum(5).toFixed(0)).toLocaleString("en-IN") },
          { label: "Order value", value: money(sum(8)), hint: "After discounts" },
          { label: "Cancelled", value: String(cancelled), tone: cancelled ? "warning" : "default" },
        ],
        chart: rows.length
          ? {
              title: "Orders per day",
              description: `${marketplaceFilterLabel(filters.marketplace)} · ${describeRange(filters.range)}`,
              orientation: "vertical",
              unit: "count",
              signColored: false,
              series: [{ key: "value", label: "Orders", color: "sales" }],
              data: days.map((day) => ({ label: formatDayShort(day), value: perDay.get(day) ?? 0 })),
            }
          : null,
      };
    }
  }
}

function pnlTiles(model: ReturnType<typeof getDashboardModel>): ReportTile[] {
  const pick = (kpiId: string) => model.kpis.find((k) => k.id === kpiId);
  return ["net-sales", "gross-profit", "net-profit", "net-margin"].flatMap((kpiId) => {
    const k = pick(kpiId);
    return k ? [{ label: k.label, value: k.value, hint: k.delta?.text, tone: k.valueTone === "negative" ? ("negative" as const) : ("default" as const) }] : [];
  });
}

export function getReportView(
  id: ReportId,
  args: { filters: GlobalFilters; sort?: { column: number; dir: SortDirection } | null; page: number },
  dataset: DemoDataset = demoDataset,
): ReportView {
  const definition = REPORTS.find((r) => r.id === id);
  if (!definition) throw new Error(`Unknown report ${id}`);
  const shape = REPORT_SHAPES[id];
  const table = buildReport(id, args.filters, dataset);
  const columns = table.headers.map((header, i) => {
    const type = shape.types[i] ?? "text";
    return { header, type, numeric: NUMERIC.includes(type) };
  });

  const requested = args.sort && args.sort.column >= 0 && args.sort.column < columns.length ? args.sort : null;
  const sort = requested ?? shape.defaultSort ?? { column: 0, dir: "asc" as const };
  const type = columns[sort.column]?.type ?? "text";
  const sorted =
    id === "pnl" && !requested
      ? table.rows
      : [...table.rows].sort((a, b) =>
          NUMERIC.includes(type)
            ? compareNullable(asDecimal(a[sort.column]), asDecimal(b[sort.column]), (x, y) => x.cmp(y), sort.dir)
            : compareNullable(
                a[sort.column] === "" || a[sort.column] == null ? null : String(a[sort.column]),
                b[sort.column] === "" || b[sort.column] == null ? null : String(b[sort.column]),
                (x, y) => x.localeCompare(y, "en-IN", { numeric: true }),
                sort.dir,
              ),
        );

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, args.page), pageCount);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows = pageRows.map((row) =>
    row.map((value, i) => {
      // P&L rows carry a percentage line and a text line inside the amount column.
      const label = String(row[0] ?? "");
      const cellType: ColumnType = id === "pnl" && i === 1 ? (label.includes("%") ? "percent" : label === "Coverage" ? "status" : "money") : (columns[i]?.type ?? "text");
      return { text: formatCell(value, cellType), negative: Boolean(asDecimal(value)?.isNegative()) };
    }),
  );

  const totals =
    shape.totals.length && table.rows.length
      ? columns.map((col, i) => {
          if (i === 0) return "Total";
          if (!shape.totals.includes(i)) return null;
          return formatCell(sumColumn(table.rows, i).toFixed(2), col.type);
        })
      : null;

  const isSnapshot = !definition.filtered.range;
  const dashboard = id === "pnl" ? getDashboardModel(args.filters, dataset) : null;
  const { tiles, chart } = tilesAndChart(id, table.rows, args.filters);
  return {
    definition,
    scopeLabel: `${definition.filtered.marketplace ? marketplaceFilterLabel(args.filters.marketplace) : "All marketplaces"} · ${isSnapshot ? `snapshot as of ${formatDayLong(dataset.workspace.today)}` : describeRange(args.filters.range)}`,
    rangeNote: isSnapshot
      ? "This report is a point-in-time snapshot of stock, so the date filter does not change it."
      : !definition.filtered.marketplace
        ? "All channels are shown side by side, so the marketplace filter does not change it."
        : null,
    columns,
    rows,
    totals,
    rowCount: table.rows.length,
    page,
    pageCount,
    sort,
    tiles: dashboard ? pnlTiles(dashboard) : tiles,
    chart: table.rows.length ? chart : null,
    pnl: dashboard,
    csvHref: `/api/reports/${id}?${globalFilterQuery(args.filters).toString()}`,
  };
}

/** Raw rows (unformatted) for tests and consistency checks. */
export function reportRows(id: ReportId, filters: GlobalFilters, dataset: DemoDataset = demoDataset): CsvValue[][] {
  return buildReport(id, filters, dataset).rows;
}

