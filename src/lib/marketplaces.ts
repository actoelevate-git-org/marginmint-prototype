import { MARKETPLACES, type Marketplace } from "@/data/demo/types";

export const MARKETPLACE_FILTERS = ["ALL", ...MARKETPLACES] as const;
export type MarketplaceFilter = (typeof MARKETPLACE_FILTERS)[number];

export const MARKETPLACE_LABEL: Record<Marketplace, string> = {
  AMAZON: "Amazon India",
  FLIPKART: "Flipkart",
  SHOPIFY: "Shopify",
  D2C: "D2C website",
};

export const MARKETPLACE_SHORT_LABEL: Record<Marketplace, string> = {
  AMAZON: "Amazon",
  FLIPKART: "Flipkart",
  SHOPIFY: "Shopify",
  D2C: "D2C",
};

export function marketplaceFilterLabel(filter: MarketplaceFilter): string {
  return filter === "ALL" ? "All marketplaces" : MARKETPLACE_LABEL[filter];
}
