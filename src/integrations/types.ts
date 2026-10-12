import type { Decimal } from "decimal.js";
import type { IntegrationProviderId } from "@/lib/env";

/**
 * Shared port for marketplace integrations. Provider-specific HTTP, auth and
 * payload mapping live behind this interface; services and UI never see raw
 * provider responses.
 */
export type ProviderCode = "AMAZON" | "FLIPKART";

export type NormalizedOrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";

export type NormalizedItem = {
  externalItemId: string;
  sku: string | null;
  productRef: string | null;
  title: string | null;
  quantity: number;
  unitPrice: Decimal | null;
  /** Item value after seller discount, excluding tax and shipping. */
  lineValue: Decimal | null;
  discount: Decimal | null;
  providerStatus: string | null;
};

export type NormalizedOrder = {
  externalOrderId: string;
  orderedAt: Date;
  providerUpdatedAt: Date | null;
  /** Order-level status when the provider supplies one; Flipkart derives it from items. */
  status: NormalizedOrderStatus | null;
  providerStatus: string | null;
  fulfilledBy: string | null;
  currency: string;
  items: NormalizedItem[];
};

export type TokenSet = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  /** Null when the provider did not issue a new refresh token (keep the stored one). */
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
};

export type CallbackResult =
  | { ok: true; code: string; state: string; externalSellerId: string | null }
  | { ok: false; reason: "denied" | "invalid_request"; state: string | null };

export type OrdersPage<Cursor> = {
  orders: NormalizedOrder[];
  /** Cursor to continue this run, or null when the window is complete. */
  next: Cursor | null;
  /** Cursor to start the next run from once this window completes. */
  resumeFrom: Cursor | null;
};

export type OrderSummary = {
  status: NormalizedOrderStatus;
  providerStatus: string;
  units: number;
  itemValue: Decimal | null;
  /** Seller-funded discount; null when the provider does not expose it. */
  discount: Decimal | null;
};

export interface MarketplaceAdapter<Cursor = unknown> {
  readonly id: IntegrationProviderId;
  readonly code: ProviderCode;
  readonly displayName: string;
  authorizationUrl(state: string): string;
  parseCallback(params: URLSearchParams): CallbackResult;
  exchangeCode(code: string, state: string): Promise<TokenSet>;
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;
  /** Validates a stored cursor; returns null for a fresh initial sync. */
  parseCursor(raw: unknown): Cursor | null;
  fetchOrdersPage(args: { accessToken: string; cursor: Cursor | null; now: Date }): Promise<OrdersPage<Cursor>>;
  /** Order-level totals and status from the full set of stored items. */
  summarize(order: Pick<NormalizedOrder, "status" | "providerStatus">, items: NormalizedItem[]): OrderSummary;
}
