import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { estimatedUnitContribution } from "@/domain/finance";
import { formatInr, formatPercent, Money } from "@/domain/money";
import { MARKETPLACE_SHORT_LABEL } from "@/lib/marketplaces";
import { compareNullable, paginate, type Page } from "@/lib/pagination";
import type { SortDirection } from "@/lib/search-params";
import { getProductPerformance, totalInventoryValue, VELOCITY_WINDOW_DAYS, velocityWindow } from "./products";

export const INVENTORY_VIEWS = ["all", "low"] as const;
export type InventoryView = (typeof INVENTORY_VIEWS)[number];
export const INVENTORY_SORT_KEYS = ["name", "available", "value", "cover"] as const;
export type InventorySortKey = (typeof INVENTORY_SORT_KEYS)[number];

export type StockStatus = "out" | "low" | "healthy";

export type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  channels: string;
  sellingPrice: string;
  unitCost: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderThreshold: number;
  inventoryValue: string;
  unitContribution: string;
  unitContributionNote: string;
  unitContributionNegative: boolean;
  cover: string;
  coverNote: string;
  status: StockStatus;
};

export function getInventoryView(
  args: { view: InventoryView; q: string; sort: { key: InventorySortKey; dir: SortDirection }; page: number },
  dataset: DemoDataset = demoDataset,
): {
  page: Page<InventoryRow>;
  summary: { skus: number; units: string; value: string; low: number; out: number };
  velocityNote: string;
} {
  const window = velocityWindow(dataset.workspace.today);
  // Profit scope is irrelevant for stock fields; the latest velocity window is used.
  const performance = getProductPerformance({ range: window, marketplace: "ALL" }, dataset);
  const q = args.q.toLowerCase();

  const rows = performance.map((row) => {
    const p = row.product;
    const listings = dataset.listings.filter((l) => l.productId === p.id);
    const contributions = listings
      .map((l) => ({
        marketplace: l.marketplace,
        value: estimatedUnitContribution({
          sellingPrice: Money.fromMinor(p.sellingPricePaise),
          unitCost: p.unitCostPaise === null ? null : Money.fromMinor(p.unitCostPaise),
          commissionBps: l.commissionBps,
          fixedFee: Money.fromMinor(l.fixedFeePaise),
          shippingPerOrder: Money.fromMinor(l.shippingPaise),
        }),
      }))
      .filter((c): c is { marketplace: typeof c.marketplace; value: Money } => c.value !== null)
      .sort((a, b) => a.value.cmp(b.value));
    const lowest = contributions[0];
    const status: StockStatus = row.available <= 0 ? "out" : row.lowStock ? "low" : "healthy";
    const cover =
      row.velocity.kind === "insufficient"
        ? { text: "Insufficient history", note: `Fewer than 3 orders in the last ${VELOCITY_WINDOW_DAYS} days` }
        : {
            text: `${row.daysOfCover?.toDecimalPlaces(0).toString() ?? "0"} days`,
            note: `${row.velocity.unitsPerDay.toDecimalPlaces(2).toString()} units/day`,
          };
    return {
      sortName: p.name,
      sortCover: row.daysOfCover,
      sortValue: row.inventoryValue,
      row: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        channels: listings.map((l) => MARKETPLACE_SHORT_LABEL[l.marketplace]).join(", "),
        sellingPrice: formatInr(Money.fromMinor(p.sellingPricePaise)),
        unitCost: p.unitCostPaise === null ? "Unknown" : formatInr(Money.fromMinor(p.unitCostPaise)),
        onHand: p.onHand,
        reserved: p.reserved,
        available: row.available,
        reorderThreshold: p.reorderThreshold,
        inventoryValue: formatInr(row.inventoryValue, { fallback: "Unknown" }),
        unitContribution: lowest ? formatInr(lowest.value) : "Unknown",
        unitContributionNote: lowest
          ? `Lowest of ${contributions.length} channel${contributions.length === 1 ? "" : "s"} (${MARKETPLACE_SHORT_LABEL[lowest.marketplace]}) · ${formatPercent(lowest.value.toMajor().div(Money.fromMinor(p.sellingPricePaise).toMajor()).mul(100))}`
          : "Unit cost missing",
        unitContributionNegative: lowest?.value.isNegative() ?? false,
        cover: cover.text,
        coverNote: cover.note,
        status,
      } satisfies InventoryRow,
    };
  });

  const filtered = rows.filter(
    ({ row }) =>
      (args.view === "all" || row.status !== "healthy") &&
      (!q || row.sku.toLowerCase().includes(q) || row.name.toLowerCase().includes(q)),
  );
  const { key, dir } = args.sort;
  filtered.sort((a, b) => {
    switch (key) {
      case "available":
        return compareNullable(a.row.available, b.row.available, (x, y) => x - y, dir);
      case "value":
        return compareNullable(a.sortValue, b.sortValue, (x, y) => x.cmp(y), dir);
      case "cover":
        return compareNullable(a.sortCover, b.sortCover, (x, y) => x.cmp(y), dir);
      case "name":
      default:
        return compareNullable(a.sortName, b.sortName, (x, y) => x.localeCompare(y), dir);
    }
  });

  const total = totalInventoryValue(dataset);
  return {
    page: paginate(filtered.map((r) => r.row), args.page),
    summary: {
      skus: dataset.products.length,
      units: total.units.toLocaleString("en-IN"),
      value: formatInr(total.value, { decimals: 0, fallback: "Unknown" }),
      low: rows.filter((r) => r.row.status === "low").length,
      out: rows.filter((r) => r.row.status === "out").length,
    },
    velocityNote: `Days of cover = sellable units ÷ average daily units sold across all channels from ${window.startDay} to ${window.endDay}.`,
  };
}
