import { z } from "zod";
import { ProviderError, requestJson, type FetchLike } from "../http";
import { parseAmount, sumOrNull } from "../money";
import type {
  CallbackResult,
  MarketplaceAdapter,
  NormalizedItem,
  NormalizedOrder,
  NormalizedOrderStatus,
  OrderSummary,
  OrdersPage,
  TokenSet,
} from "../types";
import { flipkartTokenResponseSchema, shipmentsResponseSchema, type FlipkartOrderItem } from "./schemas";

/**
 * Flipkart Marketplace Seller API adapter.
 *
 * - Authorization: OAuth authorization-code flow for third-party apps.
 *   Docs: seller.flipkart.com/api-docs/listing-api-docs/authTut.html
 * - Orders: POST /sellers/v3/shipments/filter/ (Order Management API v3).
 *
 * The filter API has no "modified since" field, so each sync re-reads a rolling
 * window of recent order dates across every filter segment and upserts the result.
 *
 * VERIFY IN SANDBOX (behaviour not fully specified by the public docs):
 * - the token endpoint method (docs show curl with query params, i.e. GET);
 * - refresh_token grant parameters;
 * - whether nextPageUrl is absolute, host-relative or relative to /sellers;
 * - whether priceComponents.sellingPrice covers the full line quantity (assumed yes);
 * - whether orderDate filters apply to postDispatch/cancelled segments.
 */
const DEFAULT_HOST = "https://api.flipkart.net";
const WINDOW_DAYS = 30;
const PAGE_SIZE = 20;

export type FlipkartConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Override for sandbox, e.g. https://sandbox-api.flipkart.net */
  apiHost?: string;
};

export const FLIPKART_SEGMENTS = [
  { type: "preDispatch", states: ["APPROVED", "PACKING_IN_PROGRESS", "PACKED", "FORM_FAILED", "READY_TO_DISPATCH"] },
  { type: "postDispatch", states: ["SHIPPED", "DELIVERED", "PICKUP_COMPLETE"], shipmentTypes: ["NORMAL"] },
  { type: "postDispatch", states: ["SHIPPED", "DELIVERED", "PICKUP_COMPLETE"], shipmentTypes: ["SELF"] },
  { type: "cancelled", states: ["CANCELLED"], cancellationType: "marketplaceCancellation" },
  { type: "cancelled", states: ["CANCELLED"], cancellationType: "sellerCancellation" },
  { type: "cancelled", states: ["CANCELLED"], cancellationType: "buyerCancellation" },
] as const;

const cursorSchema = z.object({
  from: z.string(),
  to: z.string(),
  segment: z.number().int().min(0).max(FLIPKART_SEGMENTS.length - 1),
  nextPageUrl: z.string().min(1).optional(),
});
export type FlipkartCursor = z.infer<typeof cursorSchema>;

const ITEM_STATUS: Record<string, NormalizedOrderStatus> = {
  APPROVED: "CONFIRMED",
  PACKING_IN_PROGRESS: "CONFIRMED",
  PACKED: "CONFIRMED",
  FORM_FAILED: "CONFIRMED",
  READY_TO_DISPATCH: "CONFIRMED",
  PICKUP_COMPLETE: "SHIPPED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  RETURN_REQUESTED: "DELIVERED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
};

/** Flipkart timestamps without an offset are IST. */
export function parseFlipkartDate(value: string): Date {
  const hasZone = /([+-]\d{2}:?\d{2}|Z)$/.test(value);
  return new Date(hasZone ? value : `${value}+05:30`);
}

function istIso(date: Date): string {
  // Format as IST with an explicit offset, e.g. 2026-10-11T00:00:00+05:30
  const shifted = new Date(date.getTime() + 330 * 60_000);
  return `${shifted.toISOString().slice(0, 19)}+05:30`;
}

/** Derive one order status from its items (cancelled items are ignored unless all are cancelled). */
export function deriveFlipkartOrderStatus(itemStatuses: (string | null)[]): NormalizedOrderStatus {
  const mapped = itemStatuses.map((s) => (s ? (ITEM_STATUS[s] ?? "PENDING") : "PENDING"));
  const live = mapped.filter((s) => s !== "CANCELLED");
  if (live.length === 0) return "CANCELLED";
  if (live.includes("RETURNED")) return "RETURNED";
  if (live.every((s) => s === "DELIVERED")) return "DELIVERED";
  if (live.some((s) => s === "SHIPPED" || s === "DELIVERED")) return "SHIPPED";
  if (live.every((s) => s === "PENDING")) return "PENDING";
  return "CONFIRMED";
}

function mapItem(item: FlipkartOrderItem): NormalizedItem {
  const lineValue = parseAmount(item.priceComponents?.sellingPrice);
  return {
    externalItemId: item.orderItemId,
    sku: item.sku ?? null,
    productRef: item.fsn ?? null,
    title: null,
    quantity: item.quantity,
    unitPrice: lineValue && item.quantity > 0 ? lineValue.div(item.quantity).toDecimalPlaces(2) : null,
    lineValue,
    // flipkartDiscount is funded by Flipkart, not the seller, so it is not a seller discount.
    discount: null,
    providerStatus: item.status,
  };
}

/** Group a page of shipment order items into orders by orderId. */
export function groupFlipkartItems(items: FlipkartOrderItem[]): NormalizedOrder[] {
  const byOrder = new Map<string, FlipkartOrderItem[]>();
  for (const item of items) byOrder.set(item.orderId, [...(byOrder.get(item.orderId) ?? []), item]);
  return [...byOrder.entries()].map(([orderId, orderItems]) => {
    const first = orderItems[0];
    return {
      externalOrderId: orderId,
      orderedAt: parseFlipkartDate(first?.orderDate ?? ""),
      providerUpdatedAt: null,
      status: null,
      providerStatus: null,
      fulfilledBy: null,
      currency: "INR",
      items: orderItems.map(mapItem),
    };
  });
}

export class FlipkartAdapter implements MarketplaceAdapter<FlipkartCursor> {
  readonly id = "flipkart" as const;
  readonly code = "FLIPKART" as const;
  readonly displayName = "Flipkart Seller Hub";
  private readonly host: string;

  constructor(
    private readonly config: FlipkartConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly sleep?: (ms: number) => Promise<void>,
  ) {
    this.host = config.apiHost ?? DEFAULT_HOST;
  }

  private basicAuth(): string {
    return `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`;
  }

  authorizationUrl(state: string): string {
    const url = new URL("/oauth-service/oauth/authorize", this.host);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "Seller_Api");
    url.searchParams.set("state", state);
    return url.toString();
  }

  parseCallback(params: URLSearchParams): CallbackResult {
    const state = params.get("state");
    const code = params.get("code");
    if (!state) return { ok: false, reason: "invalid_request", state: null };
    if (!code) return { ok: false, reason: params.has("error") ? "denied" : "invalid_request", state };
    return { ok: true, code, state, externalSellerId: null };
  }

  private async token(values: Record<string, string>): Promise<TokenSet> {
    const url = new URL("/oauth-service/oauth/token", this.host);
    for (const [k, v] of Object.entries(values)) url.searchParams.set(k, v);
    const json = await requestJson(
      url.toString(),
      { method: "GET", headers: { authorization: this.basicAuth() } },
      { provider: "flipkart", fetchImpl: this.fetchImpl, retries: 2, sleep: this.sleep },
    );
    const parsed = flipkartTokenResponseSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError("bad_response", null, "flipkart");
    const now = Date.now();
    return {
      accessToken: parsed.data.access_token,
      accessTokenExpiresAt: new Date(now + parsed.data.expires_in * 1000),
      refreshToken: parsed.data.refresh_token ?? null,
      refreshTokenExpiresAt: parsed.data.refresh_token_expires_in ? new Date(now + parsed.data.refresh_token_expires_in * 1000) : null,
    };
  }

  exchangeCode(code: string, state: string): Promise<TokenSet> {
    return this.token({ grant_type: "authorization_code", code, redirect_uri: this.config.redirectUri, state });
  }

  refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    return this.token({ grant_type: "refresh_token", refresh_token: refreshToken });
  }

  parseCursor(raw: unknown): FlipkartCursor | null {
    const parsed = cursorSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  private resolvePageUrl(nextPageUrl: string): string {
    if (/^https:\/\//.test(nextPageUrl)) {
      const url = new URL(nextPageUrl);
      if (url.origin !== new URL(this.host).origin) throw new ProviderError("bad_response", null, "flipkart");
      return url.toString();
    }
    const path = nextPageUrl.startsWith("/sellers/") ? nextPageUrl : `/sellers${nextPageUrl.startsWith("/") ? "" : "/"}${nextPageUrl}`;
    return new URL(path, this.host).toString();
  }

  async fetchOrdersPage(args: { accessToken: string; cursor: FlipkartCursor | null; now: Date }): Promise<OrdersPage<FlipkartCursor>> {
    const cursor: FlipkartCursor = args.cursor ?? {
      from: istIso(new Date(args.now.getTime() - WINDOW_DAYS * 86_400_000)),
      to: istIso(args.now),
      segment: 0,
    };
    const segment = FLIPKART_SEGMENTS[cursor.segment];
    if (!segment) throw new ProviderError("bad_request", null, "flipkart");
    const headers = { authorization: `Bearer ${args.accessToken}`, "content-type": "application/json" };

    const json = cursor.nextPageUrl
      ? await requestJson(this.resolvePageUrl(cursor.nextPageUrl), { method: "GET", headers }, { provider: "flipkart", fetchImpl: this.fetchImpl, sleep: this.sleep })
      : await requestJson(
          new URL("/sellers/v3/shipments/filter/", this.host).toString(),
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              filter: { ...segment, orderDate: { from: cursor.from, to: cursor.to } },
              pagination: { pageSize: PAGE_SIZE },
            }),
          },
          { provider: "flipkart", fetchImpl: this.fetchImpl, sleep: this.sleep },
        );
    const parsed = shipmentsResponseSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError("bad_response", null, "flipkart");

    const orders = groupFlipkartItems(parsed.data.shipments.flatMap((s) => s.orderItems));
    if (parsed.data.hasMore && parsed.data.nextPageUrl) {
      return { orders, next: { ...cursor, nextPageUrl: parsed.data.nextPageUrl }, resumeFrom: null };
    }
    if (cursor.segment + 1 < FLIPKART_SEGMENTS.length) {
      return { orders, next: { from: cursor.from, to: cursor.to, segment: cursor.segment + 1 }, resumeFrom: null };
    }
    // Every segment read: the next sync starts a fresh rolling window.
    return { orders, next: null, resumeFrom: null };
  }

  summarize(_order: Pick<NormalizedOrder, "status" | "providerStatus">, items: NormalizedItem[]): OrderSummary {
    const statuses = items.map((i) => i.providerStatus);
    const distinct = [...new Set(statuses.filter((s): s is string => Boolean(s)))];
    const status = deriveFlipkartOrderStatus(statuses);
    const live = status === "CANCELLED" ? items : items.filter((i) => i.providerStatus !== "CANCELLED");
    return {
      status,
      providerStatus: distinct.join(", ") || "UNKNOWN",
      units: live.reduce((n, i) => n + i.quantity, 0),
      itemValue: sumOrNull(live.map((i) => i.lineValue)),
      // Seller-funded discounts are not exposed by the shipments API.
      discount: null,
    };
  }
}
