/**
 * Demo dataset record shapes. Every amount is an integer number of paise
 * (INR minor units). Amounts are non-negative magnitudes; signs are applied in
 * the domain layer (see `src/domain/finance.ts`).
 */
export const MARKETPLACES = ["AMAZON", "FLIPKART", "SHOPIFY", "D2C"] as const;
export type Marketplace = (typeof MARKETPLACES)[number];

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILLMENT_STATUSES = ["UNFULFILLED", "PARTIAL", "FULFILLED"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const SETTLEMENT_STATUSES = ["MATCHED", "PARTIALLY_MATCHED", "UNMATCHED", "NEEDS_REVIEW", "EXCLUDED"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const SETTLEMENT_TYPES = [
  "ORDER_PROCEEDS",
  "COMMISSION",
  "FULFILLMENT_FEE",
  "ADVERTISING",
  "REFUND",
  "ADJUSTMENT",
  "TAX_WITHHOLDING",
  "SETTLEMENT_PAYOUT",
] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

export type DemoWorkspace = {
  id: string;
  name: string;
  isDemo: true;
  ownerName: string;
  currency: "INR";
  /** The demo's "today" (IST day key). All presets resolve relative to this. */
  today: string;
  /** First IST day with seeded records; comparisons before it are unavailable. */
  dataStartDay: string;
  lastSyncedAt: string;
};

export type DemoProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  /** null = cost not recorded. Treated as unknown, never zero. */
  unitCostPaise: number | null;
  sellingPricePaise: number;
  onHand: number;
  reserved: number;
  reorderThreshold: number;
  backordersEnabled: boolean;
};

export type DemoListing = {
  id: string;
  productId: string;
  marketplace: Marketplace;
  listingSku: string;
  commissionBps: number;
  fixedFeePaise: number;
  shippingPaise: number;
};

export type DemoOrderItem = {
  productId: string;
  quantity: number;
  unitPricePaise: number;
  discountPaise: number;
  unitCostPaise: number | null;
  /** Marketplace commission + fixed closing fee recorded for this line. */
  feePaise: number;
};

export type DemoOrder = {
  id: string;
  marketplace: Marketplace;
  orderedAt: string;
  customerRef: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: DemoOrderItem[];
  /** Order-level shipping & fulfillment cost borne by the seller. */
  shippingPaise: number;
};

export type DemoReturn = {
  id: string;
  orderId: string;
  productId: string;
  marketplace: Marketplace;
  returnedAt: string;
  quantity: number;
  reason: string;
  refundPaise: number;
  returnShippingPaise: number;
  recoveredInventory: boolean;
};

export type DemoSettlementTxn = {
  id: string;
  marketplace: Marketplace;
  orderId: string | null;
  occurredAt: string;
  type: SettlementType;
  expectedPaise: number;
  actualPaise: number;
  status: SettlementStatus;
  notes: string;
};

export type DemoAdMetric = {
  id: string;
  marketplace: Marketplace;
  campaign: string;
  date: string;
  spendPaise: number;
  attributedSalesPaise: number;
  attributedOrders: number;
  clicks: number;
  impressions: number;
  productId: string | null;
};

export type DemoExpense = {
  id: string;
  date: string;
  category: string;
  amountPaise: number;
  /** null = shared overhead not attributable to a single marketplace. */
  marketplace: Marketplace | null;
  notes: string;
};

export type DemoDataset = {
  workspace: DemoWorkspace;
  products: DemoProduct[];
  listings: DemoListing[];
  orders: DemoOrder[];
  returns: DemoReturn[];
  settlements: DemoSettlementTxn[];
  advertising: DemoAdMetric[];
  expenses: DemoExpense[];
};
