import type { Marketplace } from "./types";

export type ProductDef = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitCostPaise: number;
  sellingPricePaise: number;
  reorderThreshold: number;
  listings: Marketplace[];
  /** Relative order demand used only to shape the seed. Never read by analytics. */
  demandWeight: number;
  /** Seed a deliberately low stock position for this SKU. */
  lowStock?: boolean;
};

export const PRODUCT_DEFS: readonly ProductDef[] = [
  { id: "prd_earbuds", sku: "MM-101", name: "Wireless Earbuds", category: "Electronics", unitCostPaise: 89000, sellingPricePaise: 149900, reorderThreshold: 20, listings: ["AMAZON", "FLIPKART", "D2C"], demandWeight: 7, lowStock: true },
  { id: "prd_bottle", sku: "MM-102", name: "Stainless Steel Bottle", category: "Home & Kitchen", unitCostPaise: 28000, sellingPricePaise: 69900, reorderThreshold: 30, listings: ["AMAZON", "FLIPKART", "SHOPIFY"], demandWeight: 5 },
  { id: "prd_tee", sku: "MM-103", name: "Cotton T-Shirt", category: "Apparel", unitCostPaise: 22000, sellingPricePaise: 59900, reorderThreshold: 40, listings: ["FLIPKART", "SHOPIFY", "D2C"], demandWeight: 8 },
  { id: "prd_stand", sku: "MM-104", name: "Laptop Stand", category: "Electronics", unitCostPaise: 72000, sellingPricePaise: 129900, reorderThreshold: 15, listings: ["AMAZON", "SHOPIFY"], demandWeight: 4 },
  { id: "prd_yoga", sku: "MM-105", name: "Yoga Mat", category: "Fitness", unitCostPaise: 35000, sellingPricePaise: 89900, reorderThreshold: 20, listings: ["AMAZON", "FLIPKART"], demandWeight: 3 },
  { id: "prd_organizer", sku: "MM-106", name: "Desk Organizer", category: "Office", unitCostPaise: 18000, sellingPricePaise: 49900, reorderThreshold: 15, listings: ["SHOPIFY", "D2C"], demandWeight: 2 },
  { id: "prd_hub", sku: "MM-107", name: "USB-C Hub", category: "Electronics", unitCostPaise: 65000, sellingPricePaise: 119900, reorderThreshold: 12, listings: ["AMAZON", "D2C"], demandWeight: 4, lowStock: true },
  { id: "prd_mug", sku: "MM-108", name: "Insulated Travel Mug", category: "Home & Kitchen", unitCostPaise: 24000, sellingPricePaise: 79900, reorderThreshold: 18, listings: ["AMAZON", "FLIPKART", "SHOPIFY"], demandWeight: 3 },
  { id: "prd_lamp", sku: "MM-109", name: "LED Desk Lamp", category: "Office", unitCostPaise: 54000, sellingPricePaise: 139900, reorderThreshold: 10, listings: ["AMAZON", "SHOPIFY"], demandWeight: 2 },
  { id: "prd_keyboard", sku: "MM-110", name: "Compact Keyboard", category: "Electronics", unitCostPaise: 98000, sellingPricePaise: 189900, reorderThreshold: 10, listings: ["AMAZON", "D2C"], demandWeight: 2 },
  { id: "prd_mouse", sku: "MM-111", name: "Silent Wireless Mouse", category: "Electronics", unitCostPaise: 42000, sellingPricePaise: 99900, reorderThreshold: 15, listings: ["AMAZON", "FLIPKART"], demandWeight: 3 },
  { id: "prd_charger", sku: "MM-112", name: "65W GaN Charger", category: "Electronics", unitCostPaise: 78000, sellingPricePaise: 159900, reorderThreshold: 12, listings: ["AMAZON", "FLIPKART", "D2C"], demandWeight: 3 },
  { id: "prd_pillow", sku: "MM-113", name: "Memory Foam Pillow", category: "Home & Kitchen", unitCostPaise: 31000, sellingPricePaise: 89900, reorderThreshold: 12, listings: ["FLIPKART", "SHOPIFY"], demandWeight: 2 },
  { id: "prd_sheets", sku: "MM-114", name: "Cotton Bed Sheet Set", category: "Home & Kitchen", unitCostPaise: 64000, sellingPricePaise: 149900, reorderThreshold: 8, listings: ["FLIPKART", "SHOPIFY", "D2C"], demandWeight: 1 },
  { id: "prd_blender", sku: "MM-115", name: "Personal Blender", category: "Home & Kitchen", unitCostPaise: 112000, sellingPricePaise: 219900, reorderThreshold: 6, listings: ["AMAZON", "FLIPKART"], demandWeight: 1 },
  { id: "prd_pan", sku: "MM-116", name: "Non-stick Fry Pan", category: "Home & Kitchen", unitCostPaise: 45000, sellingPricePaise: 109900, reorderThreshold: 10, listings: ["FLIPKART", "D2C"], demandWeight: 2 },
  { id: "prd_bag", sku: "MM-117", name: "Laptop Backpack", category: "Accessories", unitCostPaise: 58000, sellingPricePaise: 169900, reorderThreshold: 10, listings: ["AMAZON", "SHOPIFY", "D2C"], demandWeight: 2 },
  { id: "prd_band", sku: "MM-118", name: "Fitness Band", category: "Electronics", unitCostPaise: 125000, sellingPricePaise: 249900, reorderThreshold: 8, listings: ["AMAZON", "FLIPKART"], demandWeight: 2, lowStock: true },
  { id: "prd_speaker", sku: "MM-119", name: "Portable Bluetooth Speaker", category: "Electronics", unitCostPaise: 92000, sellingPricePaise: 199900, reorderThreshold: 8, listings: ["AMAZON", "SHOPIFY"], demandWeight: 2 },
  { id: "prd_cable", sku: "MM-120", name: "Braided USB-C Cable (3-pack)", category: "Electronics", unitCostPaise: 9000, sellingPricePaise: 39900, reorderThreshold: 30, listings: ["AMAZON", "FLIPKART", "D2C"], demandWeight: 6, lowStock: true },
  { id: "prd_tripod", sku: "MM-121", name: "Phone Tripod Stand", category: "Accessories", unitCostPaise: 16000, sellingPricePaise: 54900, reorderThreshold: 15, listings: ["SHOPIFY", "D2C"], demandWeight: 2 },
  { id: "prd_filter", sku: "MM-122", name: "Jug Water Filter", category: "Home & Kitchen", unitCostPaise: 38000, sellingPricePaise: 99900, reorderThreshold: 8, listings: ["FLIPKART", "D2C"], demandWeight: 1 },
  { id: "prd_stool", sku: "MM-123", name: "Folding Step Stool", category: "Home & Kitchen", unitCostPaise: 27000, sellingPricePaise: 79900, reorderThreshold: 6, listings: ["AMAZON", "FLIPKART"], demandWeight: 1 },
  { id: "prd_notebook", sku: "MM-124", name: "Hardcover Notebook (2-pack)", category: "Office", unitCostPaise: 8000, sellingPricePaise: 34900, reorderThreshold: 20, listings: ["SHOPIFY", "D2C"], demandWeight: 3 },
  { id: "prd_diffuser", sku: "MM-125", name: "Essential Oil Diffuser", category: "Home & Kitchen", unitCostPaise: 41000, sellingPricePaise: 129900, reorderThreshold: 6, listings: ["SHOPIFY", "D2C"], demandWeight: 1 },
];

/** Demo rate card per channel. Shopify and D2C rows are payment-gateway fees. */
export const MARKETPLACE_RATE_CARD: Record<
  Marketplace,
  { commissionBps: number; fixedFeePaise: number; shippingPaise: number; settlementLagDays: number; deductsShipping: boolean }
> = {
  AMAZON: { commissionBps: 1800, fixedFeePaise: 2500, shippingPaise: 6500, settlementLagDays: 7, deductsShipping: true },
  FLIPKART: { commissionBps: 1600, fixedFeePaise: 2000, shippingPaise: 6000, settlementLagDays: 10, deductsShipping: true },
  SHOPIFY: { commissionBps: 200, fixedFeePaise: 0, shippingPaise: 7500, settlementLagDays: 3, deductsShipping: false },
  D2C: { commissionBps: 200, fixedFeePaise: 0, shippingPaise: 8000, settlementLagDays: 2, deductsShipping: false },
};

/** Demo "today" in IST. All presets resolve relative to this day. */
export const ANCHOR_DATE = "2026-10-11";
/** Days of seeded order history ending on ANCHOR_DATE. */
export const HISTORY_DAYS = 95;
