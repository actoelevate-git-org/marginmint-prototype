import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset, DemoOrder, FulfillmentStatus, OrderStatus } from "@/data/demo/types";
import { Decimal } from "decimal.js";
import { computeProfitBreakdown, settlementDifference } from "@/domain/finance";
import { formatInr, formatPercent, Money } from "@/domain/money";
import { dayKeyOf, formatDayLong, formatInstantIst, isInstantInRange, type DateRange } from "@/lib/dates";
import { MARKETPLACE_LABEL, type MarketplaceFilter } from "@/lib/marketplaces";
import { compareNullable, paginate, type Page } from "@/lib/pagination";
import type { SortDirection } from "@/lib/search-params";
import { getLedger } from "./ledger";
import { SETTLEMENT_STATUS_LABEL, SETTLEMENT_TYPE_LABEL } from "./settlements";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Unfulfilled",
  PARTIAL: "In transit",
  FULFILLED: "Fulfilled",
};

export const ORDER_SORT_KEYS = ["date", "value", "units"] as const;
export type OrderSortKey = (typeof ORDER_SORT_KEYS)[number];

function orderNetValue(order: DemoOrder): Money {
  return order.items.reduce(
    (sum, item) => sum.add(Money.fromMinor(item.unitPricePaise).mul(item.quantity).sub(Money.fromMinor(item.discountPaise))),
    Money.zero(),
  );
}

function orderDiscount(order: DemoOrder): Money {
  return order.items.reduce((sum, item) => sum.add(Money.fromMinor(item.discountPaise)), Money.zero());
}

function settlementLabel(order: DemoOrder, dataset: DemoDataset): { label: string; tone: "positive" | "warning" | "neutral" } {
  const txns = dataset.settlements.filter((txn) => txn.orderId === order.id);
  if (txns.some((txn) => txn.status === "NEEDS_REVIEW")) return { label: "Needs review", tone: "warning" };
  if (txns.some((txn) => txn.status === "UNMATCHED")) return { label: "Awaiting payout", tone: "neutral" };
  if (txns.length > 0 && txns.every((txn) => txn.status === "MATCHED")) return { label: "Settled", tone: "positive" };
  if (order.status === "CANCELLED") return { label: "Not applicable", tone: "neutral" };
  return { label: "Not yet due", tone: "neutral" };
}

export type OrderRow = {
  id: string;
  href: string;
  date: string;
  marketplace: string;
  customerRef: string;
  products: number;
  units: number;
  value: string;
  discount: string;
  status: OrderStatus;
  statusLabel: string;
  fulfillment: string;
  settlement: { label: string; tone: "positive" | "warning" | "neutral" };
};

export function orderHref(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}`;
}

export function listOrders(
  args: {
    range: DateRange;
    marketplace: MarketplaceFilter;
    status: OrderStatus | "ALL";
    q: string;
    sort: { key: OrderSortKey; dir: SortDirection };
    page: number;
  },
  dataset: DemoDataset = demoDataset,
): Page<OrderRow> & { statusCounts: Record<OrderStatus | "ALL", number> } {
  const q = args.q.toLowerCase();
  const skuToId = new Map(dataset.products.map((p) => [p.sku.toLowerCase(), p.id]));
  const scoped = dataset.orders.filter(
    (order) =>
      isInstantInRange(order.orderedAt, args.range) &&
      (args.marketplace === "ALL" || order.marketplace === args.marketplace) &&
      (!q ||
        order.id.toLowerCase().includes(q) ||
        order.customerRef.toLowerCase().includes(q) ||
        order.items.some((item) => item.productId === skuToId.get(q))),
  );
  const statusCounts = { ALL: scoped.length } as Record<OrderStatus | "ALL", number>;
  for (const status of Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]) {
    statusCounts[status] = scoped.filter((o) => o.status === status).length;
  }
  const filtered = scoped.filter((order) => args.status === "ALL" || order.status === args.status);

  const { key, dir } = args.sort;
  const units = (o: DemoOrder) => o.items.reduce((n, i) => n + i.quantity, 0);
  const sorted = [...filtered].sort((a, b) => {
    if (key === "value") return compareNullable(orderNetValue(a), orderNetValue(b), (x, y) => x.cmp(y), dir);
    if (key === "units") return compareNullable(units(a), units(b), (x, y) => x - y, dir);
    return compareNullable(a.orderedAt, b.orderedAt, (x, y) => x.localeCompare(y), dir);
  });

  const page = paginate(sorted, args.page);
  return {
    ...page,
    statusCounts,
    rows: page.rows.map((order) => ({
      id: order.id,
      href: orderHref(order.id),
      date: formatDayLong(dayKeyOf(order.orderedAt)),
      marketplace: MARKETPLACE_LABEL[order.marketplace],
      customerRef: order.customerRef,
      products: order.items.length,
      units: units(order),
      value: formatInr(orderNetValue(order)),
      discount: orderDiscount(order).isZero() ? "—" : formatInr(orderDiscount(order)),
      status: order.status,
      statusLabel: ORDER_STATUS_LABEL[order.status],
      fulfillment: FULFILLMENT_LABEL[order.fulfillmentStatus],
      settlement: settlementLabel(order, dataset),
    })),
  };
}

export type OrderDetail = {
  id: string;
  placedAt: string;
  marketplace: string;
  customerRef: string;
  status: OrderStatus;
  statusLabel: string;
  fulfillment: string;
  lines: {
    sku: string;
    name: string;
    productHref: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    net: string;
    cogs: string;
    fees: string;
    shipping: string;
  }[];
  profit: { label: string; value: string; emphasis?: boolean; negative?: boolean }[];
  cancelled: boolean;
  returns: { id: string; date: string; sku: string; quantity: number; reason: string; refund: string; loss: string; recovered: boolean }[];
  settlements: { id: string; type: string; date: string; expected: string; actual: string; difference: string; status: string; notes: string }[];
};

export function getOrderDetail(orderId: string, dataset: DemoDataset = demoDataset): OrderDetail | null {
  const order = dataset.orders.find((row) => row.id === orderId);
  if (!order) return null;
  const ledger = getLedger(dataset);
  const lines = ledger.lines.filter((line) => line.orderId === order.id);
  const returns = ledger.returns.filter((fact) => fact.orderId === order.id);
  const products = new Map(dataset.products.map((p) => [p.id, p]));
  const cancelled = order.status === "CANCELLED";

  const kept = cancelled ? [] : lines;
  const sumOf = (pick: (l: (typeof lines)[number]) => Money) => kept.reduce((s, l) => s.add(pick(l)), Money.zero());
  const cogsMissing = kept.some((l) => l.cogs === null);
  const breakdown = computeProfitBreakdown({
    grossItemSales: lines.reduce((s, l) => s.add(l.gross), Money.zero()),
    discounts: sumOf((l) => l.discount),
    cancelledItemValue: cancelled ? lines.reduce((s, l) => s.add(l.gross.sub(l.discount)), Money.zero()) : Money.zero(),
    cogs: cogsMissing ? null : sumOf((l) => l.cogs ?? Money.zero()),
    variableFees: sumOf((l) => l.fees),
    fulfillmentAndShipping: sumOf((l) => l.shipping),
    otherVariableCosts: Money.zero(),
    advertising: Money.zero(),
    otherOperatingExpenses: Money.zero(),
    refundAndReturnLosses: returns.reduce((s, r) => s.add(r.loss), Money.zero()),
  });
  const neg = (m: Money | null) => formatInr(m ? m.mul(-1) : null, { fallback: "Unknown" });

  return {
    id: order.id,
    placedAt: formatInstantIst(order.orderedAt),
    marketplace: MARKETPLACE_LABEL[order.marketplace],
    customerRef: order.customerRef,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    fulfillment: FULFILLMENT_LABEL[order.fulfillmentStatus],
    cancelled,
    lines: lines.map((line) => {
      const product = products.get(line.productId);
      return {
        sku: product?.sku ?? line.productId,
        name: product?.name ?? "Unknown product",
        productHref: `/products?q=${encodeURIComponent(product?.sku ?? "")}`,
        quantity: line.units,
        unitPrice: formatInr(line.gross.mul(new Decimal(1).div(line.units))),
        discount: line.discount.isZero() ? "—" : formatInr(line.discount),
        net: formatInr(line.gross.sub(line.discount)),
        cogs: formatInr(line.cogs, { fallback: "Unknown" }),
        fees: formatInr(line.fees),
        shipping: formatInr(line.shipping),
      };
    }),
    profit: [
      { label: "Gross item sales", value: formatInr(breakdown.grossItemSales) },
      { label: "Discounts", value: neg(breakdown.discounts) },
      ...(cancelled ? [{ label: "Cancelled value", value: neg(breakdown.cancelledItemValue) }] : []),
      { label: "Net sales", value: formatInr(breakdown.netSales), emphasis: true },
      { label: "Cost of goods sold", value: neg(breakdown.cogs) },
      { label: "Marketplace fees", value: neg(breakdown.variableFees) },
      { label: "Shipping & fulfilment", value: neg(breakdown.fulfillmentAndShipping) },
      {
        label: "Contribution profit",
        value: formatInr(breakdown.contributionProfit, { fallback: "Unknown" }),
        emphasis: true,
        negative: breakdown.contributionProfit?.isNegative(),
      },
      { label: "Refund & return losses", value: neg(breakdown.refundAndReturnLosses) },
      {
        label: "Order profit after returns",
        value: formatInr(breakdown.operatingNetProfit, { fallback: "Unknown" }),
        emphasis: true,
        negative: breakdown.operatingNetProfit?.isNegative(),
      },
      { label: "Margin on net sales", value: formatPercent(breakdown.netProfitMargin) },
    ],
    returns: returns.map((fact) => ({
      id: fact.id,
      date: formatDayLong(fact.day),
      sku: products.get(fact.productId)?.sku ?? fact.productId,
      quantity: fact.units,
      reason: fact.reason,
      refund: formatInr(fact.refund),
      loss: formatInr(fact.loss),
      recovered: !fact.recoveredCost.isZero(),
    })),
    settlements: dataset.settlements
      .filter((txn) => txn.orderId === order.id)
      .map((txn) => {
        const pending = txn.status === "UNMATCHED";
        const diff = settlementDifference({
          expected: Money.fromMinor(txn.expectedPaise),
          actual: Money.fromMinor(txn.actualPaise),
        });
        return {
          id: txn.id,
          type: SETTLEMENT_TYPE_LABEL[txn.type],
          date: formatDayLong(dayKeyOf(txn.occurredAt)),
          expected: formatInr(Money.fromMinor(txn.expectedPaise)),
          actual: pending ? "Not received" : formatInr(Money.fromMinor(txn.actualPaise)),
          difference: pending ? "—" : formatInr(diff, { signDisplay: "always" }),
          status: SETTLEMENT_STATUS_LABEL[txn.status],
          notes: txn.notes,
        };
      }),
  };
}
