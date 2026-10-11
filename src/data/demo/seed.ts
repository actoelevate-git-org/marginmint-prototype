import { addDays, dayKeyOf, diffDays } from "@/lib/dates";
import { ANCHOR_DATE, HISTORY_DAYS, MARKETPLACE_RATE_CARD, PRODUCT_DEFS, type ProductDef } from "./catalog";
import { createRng, intBetween, pick, pickWeighted } from "./rng";
import type {
  DemoAdMetric,
  DemoDataset,
  DemoExpense,
  DemoListing,
  DemoOrder,
  DemoOrderItem,
  DemoProduct,
  DemoReturn,
  DemoSettlementTxn,
  FulfillmentStatus,
  Marketplace,
  OrderStatus,
} from "./types";

/**
 * Reproducible seed for the "Acme Commerce India" demo workspace.
 *
 * This module only *creates records*. It never computes KPIs: every figure the
 * UI shows is derived from these records by the domain + service layers.
 */

const RETURN_REASONS = [
  "Damaged product",
  "Wrong item",
  "Customer changed mind",
  "Product quality",
  "Delivery issue",
  "Other",
] as const;

/** Orders on the demo "today" stop at the last sync time. */
const SYNC_HOUR_IST = 14;
const SYNC_MINUTE_IST = 10;

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

function istInstant(day: string, hour: number, minute: number): string {
  return new Date(`${day}T${pad(hour, 2)}:${pad(minute, 2)}:00+05:30`).toISOString();
}

function marketplaceOrderId(marketplace: Marketplace, n: number): string {
  switch (marketplace) {
    case "AMAZON":
      return `408-${pad(3100000 + n * 7, 7)}-${pad(5200000 + n * 13, 7)}`;
    case "FLIPKART":
      return `OD${pad(330417000000 + n * 31, 12)}`;
    case "SHOPIFY":
      return `#MM${pad(10400 + n, 5)}`;
    case "D2C":
      return `D2C-26-${pad(n, 5)}`;
  }
}

function statusFor(rng: () => number, daysAgo: number): OrderStatus {
  if (daysAgo <= 1 && rng() < 0.4) return "PENDING";
  if (daysAgo <= 3 && rng() < 0.45) return "CONFIRMED";
  if (daysAgo <= 6 && rng() < 0.5) return "SHIPPED";
  if (rng() < 0.05) return "CANCELLED";
  if (daysAgo >= 10 && rng() < 0.12) return "RETURNED";
  return "DELIVERED";
}

function fulfillmentFor(status: OrderStatus): FulfillmentStatus {
  if (status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED") return "UNFULFILLED";
  if (status === "SHIPPED") return "PARTIAL";
  return "FULFILLED";
}

function buildLine(rng: () => number, def: ProductDef, listing: DemoListing): DemoOrderItem {
  const quantity = def.sellingPricePaise > 150000 ? 1 : intBetween(rng, 1, 3);
  const lineGross = def.sellingPricePaise * quantity;
  const discountPaise = rng() < 0.22 ? Math.round((lineGross * intBetween(rng, 5, 15)) / 100) : 0;
  const feePaise =
    Math.round(((lineGross - discountPaise) * listing.commissionBps) / 10000) + listing.fixedFeePaise * quantity;
  return {
    productId: def.id,
    quantity,
    unitPricePaise: def.sellingPricePaise,
    discountPaise,
    unitCostPaise: def.unitCostPaise,
    feePaise,
  };
}

function lineNet(item: DemoOrderItem): number {
  return item.unitPricePaise * item.quantity - item.discountPaise;
}

/** Proceeds the channel should remit for an order (before any discrepancy). */
function expectedProceeds(order: DemoOrder): number {
  const card = MARKETPLACE_RATE_CARD[order.marketplace];
  const net = order.items.reduce((sum, item) => sum + lineNet(item) - item.feePaise, 0);
  return card.deductsShipping ? net - order.shippingPaise : net;
}

const DISCREPANCY_NOTES: Record<Marketplace, string> = {
  AMAZON: "Weight-handling fee charged above the rate card.",
  FLIPKART: "Shipping fee reversal not yet credited.",
  SHOPIFY: "Payment gateway fee differs from configured 2%.",
  D2C: "Gateway deducted a chargeback reserve.",
};

export function buildDemoDataset(seed = 20261011): DemoDataset {
  const rng = createRng(seed);
  const today = ANCHOR_DATE;
  const dataStartDay = addDays(today, -(HISTORY_DAYS - 1));
  const defById = new Map(PRODUCT_DEFS.map((def) => [def.id, def]));

  const listings: DemoListing[] = PRODUCT_DEFS.flatMap((def) =>
    def.listings.map((marketplace) => {
      const card = MARKETPLACE_RATE_CARD[marketplace];
      return {
        id: `lst_${def.id}_${marketplace.toLowerCase()}`,
        productId: def.id,
        marketplace,
        listingSku: `${def.sku}-${marketplace.slice(0, 3)}`,
        commissionBps: card.commissionBps,
        fixedFeePaise: card.fixedFeePaise,
        shippingPaise: card.shippingPaise,
      };
    }),
  );
  const listingFor = (productId: string, marketplace: Marketplace): DemoListing | undefined =>
    listings.find((row) => row.productId === productId && row.marketplace === marketplace);

  const orders: DemoOrder[] = [];
  const returns: DemoReturn[] = [];
  let orderSeq = 1;
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = addDays(today, -daysAgo);
    const count = daysAgo === 0 ? intBetween(rng, 1, 2) : intBetween(rng, 1, 3);
    for (let i = 0; i < count; i += 1) {
      const def = pickWeighted(rng, PRODUCT_DEFS, (row) => row.demandWeight);
      const marketplace = pick(rng, def.listings);
      const listing = listingFor(def.id, marketplace);
      if (!listing) continue;

      const items = [buildLine(rng, def, listing)];
      if (rng() < 0.15) {
        const companions = PRODUCT_DEFS.filter((row) => row.id !== def.id && row.listings.includes(marketplace));
        const companion = pickWeighted(rng, companions, (row) => row.demandWeight);
        const companionListing = listingFor(companion.id, marketplace);
        if (companionListing) items.push(buildLine(rng, companion, companionListing));
      }

      const hour = daysAgo === 0 ? intBetween(rng, 8, SYNC_HOUR_IST - 1) : intBetween(rng, 8, 22);
      const orderedAt = istInstant(day, hour, intBetween(rng, 0, 59));
      let status = statusFor(rng, daysAgo);
      // Cotton T-Shirt is seeded with a sizing problem: elevated returns.
      if (def.id === "prd_tee" && status === "DELIVERED" && daysAgo >= 10 && rng() < 0.22) status = "RETURNED";

      const order: DemoOrder = {
        id: marketplaceOrderId(marketplace, orderSeq),
        marketplace,
        orderedAt,
        customerRef: `CUST-${pad(48000 + ((orderSeq * 7919) % 9000), 5)}`,
        status,
        fulfillmentStatus: fulfillmentFor(status),
        items,
        shippingPaise: listing.shippingPaise,
      };
      orders.push(order);
      orderSeq += 1;

      if (status === "RETURNED") {
        const item = items[0];
        if (!item) continue;
        const partial = item.quantity > 1 && rng() < 0.3;
        const quantity = partial ? 1 : item.quantity;
        const returnDay = addDays(day, intBetween(rng, 3, Math.min(9, daysAgo)));
        returns.push({
          id: `RET-${pad(returns.length + 1, 4)}`,
          orderId: order.id,
          productId: item.productId,
          marketplace,
          returnedAt: istInstant(returnDay, intBetween(rng, 10, 18), intBetween(rng, 0, 59)),
          quantity,
          reason: def.id === "prd_tee" && rng() < 0.6 ? "Product quality" : pick(rng, RETURN_REASONS),
          refundPaise: Math.round((lineNet(item) * quantity) / item.quantity),
          returnShippingPaise: intBetween(rng, 4500, 8900),
          recoveredInventory: rng() > 0.3,
        });
      }
    }
  }

  // Settlements: order proceeds settle after the channel's lag. Orders still
  // inside the lag window are "awaiting payout" (UNMATCHED, nothing received).
  const settlements: DemoSettlementTxn[] = [];
  let settledCount = 0;
  for (const order of orders) {
    const daysAgo = diffDays(dayKeyOf(order.orderedAt), today);
    const card = MARKETPLACE_RATE_CARD[order.marketplace];
    const settled = (order.status === "DELIVERED" || order.status === "RETURNED") && daysAgo >= card.settlementLagDays;
    const awaiting =
      order.status === "SHIPPED" || (order.status === "DELIVERED" && daysAgo < card.settlementLagDays);
    if (!settled && !awaiting) continue;

    const expected = expectedProceeds(order);
    const id = `STL-${pad(settlements.length + 1, 5)}`;
    if (awaiting) {
      settlements.push({
        id,
        marketplace: order.marketplace,
        orderId: order.id,
        occurredAt: order.orderedAt,
        type: "ORDER_PROCEEDS",
        expectedPaise: expected,
        actualPaise: 0,
        status: "UNMATCHED",
        notes: `Awaiting payout — ${card.settlementLagDays}-day settlement cycle.`,
      });
      continue;
    }

    settledCount += 1;
    const discrepancy = settledCount % 11 === 4;
    const overpaid = discrepancy && settledCount % 33 === 15;
    const delta = discrepancy ? Math.min(intBetween(rng, 8000, 45000), Math.round(expected * 0.4)) : 0;
    const actual = overpaid ? expected + delta : expected - delta;
    settlements.push({
      id,
      marketplace: order.marketplace,
      orderId: order.id,
      occurredAt: istInstant(addDays(dayKeyOf(order.orderedAt), card.settlementLagDays), 11, 0),
      type: "ORDER_PROCEEDS",
      expectedPaise: expected,
      actualPaise: actual,
      status: discrepancy ? "NEEDS_REVIEW" : "MATCHED",
      notes: overpaid
        ? "Unexplained additional credit — confirm before treating as income."
        : discrepancy
          ? DISCREPANCY_NOTES[order.marketplace]
          : "Exact order reference match.",
    });
  }

  // Advertising: sponsored-product campaigns over the last 60 days. Spend was
  // scaled up ~40% in the most recent 30 days.
  const advertising: DemoAdMetric[] = [];
  const campaigns: { productId: string; marketplace: Marketplace; spend: [number, number]; roas: [number, number] }[] = [
    { productId: "prd_earbuds", marketplace: "AMAZON", spend: [6000, 12000], roas: [320, 520] },
    { productId: "prd_stand", marketplace: "AMAZON", spend: [15000, 26000], roas: [70, 120] },
    { productId: "prd_hub", marketplace: "AMAZON", spend: [4000, 8000], roas: [300, 480] },
    { productId: "prd_band", marketplace: "FLIPKART", spend: [4000, 9000], roas: [260, 420] },
    { productId: "prd_tee", marketplace: "FLIPKART", spend: [3000, 7000], roas: [280, 450] },
  ];
  for (let daysAgo = 59; daysAgo >= 0; daysAgo -= 1) {
    const date = addDays(today, -daysAgo);
    const ramp = daysAgo < 30 ? 1.4 : 1;
    for (const campaign of campaigns) {
      if (rng() < 0.5) continue;
      const def = defById.get(campaign.productId);
      if (!def) continue;
      const spend = Math.round(intBetween(rng, campaign.spend[0], campaign.spend[1]) * ramp);
      const attributed = Math.round((spend * intBetween(rng, campaign.roas[0], campaign.roas[1])) / 100);
      const clicks = Math.max(1, Math.round(spend / intBetween(rng, 600, 1400)));
      advertising.push({
        id: `AD-${pad(advertising.length + 1, 4)}`,
        marketplace: campaign.marketplace,
        campaign: `SP · ${def.name} · Exact`,
        date,
        spendPaise: spend,
        attributedSalesPaise: attributed,
        attributedOrders: Math.max(0, Math.round(attributed / def.sellingPricePaise)),
        clicks,
        impressions: clicks * intBetween(rng, 35, 80),
        productId: def.id,
      });
    }
  }

  // Recorded operating expenses (monthly). Shared overhead has no marketplace.
  const expenses: DemoExpense[] = [];
  for (let monthOffset = 0; monthOffset < 4; monthOffset += 1) {
    const [y, m] = today.split("-").map(Number) as [number, number];
    const monthIndex = m - 1 - monthOffset;
    const first = new Date(Date.UTC(y, monthIndex, 1)).toISOString().slice(0, 10);
    const fifth = addDays(first, 4);
    const rows: Omit<DemoExpense, "id">[] = [
      { date: first, category: "Packaging", amountPaise: 680000 + monthOffset * 15000, marketplace: null, notes: "Mailers, tape and void fill" },
      { date: first, category: "Software", amountPaise: 249900, marketplace: null, notes: "Inventory + invoicing subscriptions" },
      { date: fifth, category: "Storage fees", amountPaise: 185000, marketplace: "AMAZON", notes: "Fulfilment centre monthly storage" },
    ];
    for (const row of rows) {
      if (row.date < dataStartDay || row.date > today) continue;
      expenses.push({ id: `EXP-${pad(expenses.length + 1, 3)}`, ...row });
    }
  }

  const products: DemoProduct[] = PRODUCT_DEFS.map((def) => {
    const onHand = def.lowStock ? intBetween(rng, 3, 7) : intBetween(rng, 28, 160);
    const reserved = Math.min(onHand, def.lowStock ? intBetween(rng, 0, 2) : intBetween(rng, 0, 8));
    return {
      id: def.id,
      sku: def.sku,
      name: def.name,
      category: def.category,
      unitCostPaise: def.unitCostPaise,
      sellingPricePaise: def.sellingPricePaise,
      onHand,
      reserved,
      reorderThreshold: def.reorderThreshold,
      backordersEnabled: false,
    };
  });

  return {
    workspace: {
      id: "ws_acme_india",
      name: "Acme Commerce India",
      isDemo: true,
      ownerName: "Priya",
      currency: "INR",
      today,
      dataStartDay,
      lastSyncedAt: istInstant(today, SYNC_HOUR_IST, SYNC_MINUTE_IST),
    },
    products,
    listings,
    orders: orders.sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)),
    returns: returns.sort((a, b) => b.returnedAt.localeCompare(a.returnedAt)),
    settlements: settlements.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    advertising,
    expenses,
  };
}

export const demoDataset: DemoDataset = buildDemoDataset();
