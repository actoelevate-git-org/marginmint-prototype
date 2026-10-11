import type { Decimal } from "decimal.js";
import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset, DemoProduct } from "@/data/demo/types";
import {
  availableStock,
  daysOfStockRemaining,
  inventoryValue,
  salesVelocity,
  type ProfitBreakdown,
  type SalesVelocity,
} from "@/domain/finance";
import type { ProductSignal } from "@/domain/insights";
import { Money } from "@/domain/money";
import { addDays, type DateRange } from "@/lib/dates";
import { adTotalsFor, getLedger, profitFor, unitStatsFor, type Ledger, type Scope, type UnitStats } from "./ledger";

/** Velocity window for stock-cover forecasts (always the latest N days, all channels). */
export const VELOCITY_WINDOW_DAYS = 30;

export type ProductPerformance = {
  product: DemoProduct;
  profit: ProfitBreakdown;
  units: UnitStats;
  /** Contribution profit − return losses, i.e. operating profit before advertising. */
  profitBeforeAds: Money | null;
  attributedAdSales: Money;
  available: number;
  inventoryValue: Money | null;
  velocity: SalesVelocity;
  daysOfCover: Decimal | null;
  lowStock: boolean;
};

export function velocityWindow(today: string): DateRange {
  return { preset: "custom", startDay: addDays(today, -(VELOCITY_WINDOW_DAYS - 1)), endDay: today };
}

function stockPosition(ledger: Ledger, product: DemoProduct) {
  const available = availableStock({ onHand: product.onHand, reserved: product.reserved });
  // Stock is shared across channels, so velocity always uses every marketplace.
  const recent = unitStatsFor(ledger, {
    range: velocityWindow(ledger.dataset.workspace.today),
    marketplace: "ALL",
    productId: product.id,
  });
  const velocity = salesVelocity({ unitsSold: recent.soldUnits, orders: recent.orders, windowDays: VELOCITY_WINDOW_DAYS });
  return {
    available,
    inventoryValue: inventoryValue({
      sellableUnits: available,
      unitCost: product.unitCostPaise === null ? null : Money.fromMinor(product.unitCostPaise),
    }),
    velocity,
    daysOfCover: daysOfStockRemaining({
      available,
      averageDailyUnits: velocity.kind === "known" ? velocity.unitsPerDay : null,
    }),
    lowStock: available <= product.reorderThreshold,
  };
}

export function getProductPerformance(
  scope: Omit<Scope, "productId">,
  dataset: DemoDataset = demoDataset,
): ProductPerformance[] {
  const ledger = getLedger(dataset);
  return dataset.products.map((product) => {
    const productScope: Scope = { ...scope, productId: product.id };
    const profit = profitFor(ledger, productScope);
    return {
      product,
      profit,
      units: unitStatsFor(ledger, productScope),
      profitBeforeAds: profit.contributionProfit ? profit.contributionProfit.sub(profit.refundAndReturnLosses) : null,
      attributedAdSales: adTotalsFor(ledger, productScope).attributed,
      ...stockPosition(ledger, product),
    };
  });
}

export function toProductSignal(row: ProductPerformance): ProductSignal {
  return {
    productId: row.product.id,
    sku: row.product.sku,
    name: row.product.name,
    netSales: row.profit.netSales,
    advertising: row.profit.advertising,
    profitBeforeAds: row.profitBeforeAds,
    netProfit: row.profit.operatingNetProfit,
    netMargin: row.profit.netProfitMargin,
    soldUnits: row.units.soldUnits,
    returnedUnits: row.units.returnedUnits,
    returnRate: row.units.returnRate,
    available: row.available,
    reorderThreshold: row.product.reorderThreshold,
    velocity: row.velocity,
    daysOfCover: row.daysOfCover,
  };
}

export function totalInventoryValue(dataset: DemoDataset = demoDataset): { value: Money | null; units: number; unknownCostSkus: number } {
  let value: Money | null = Money.zero();
  let units = 0;
  let unknownCostSkus = 0;
  for (const product of dataset.products) {
    const available = Math.max(0, availableStock({ onHand: product.onHand, reserved: product.reserved }));
    units += available;
    const v = inventoryValue({
      sellableUnits: available,
      unitCost: product.unitCostPaise === null ? null : Money.fromMinor(product.unitCostPaise),
    });
    if (v === null) {
      unknownCostSkus += 1;
      value = null;
    } else if (value) {
      value = value.add(v);
    }
  }
  return { value, units, unknownCostSkus };
}
