import { Decimal } from "decimal.js";
import { z } from "zod";
import { formBody, ProviderError, requestJson, type FetchLike } from "../http";
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
import { lwaTokenResponseSchema, searchOrdersResponseSchema, type AmazonOrder, type AmazonOrderItem } from "./schemas";

/**
 * Amazon Selling Partner API adapter (India marketplace).
 *
 * - Authorization: website authorization workflow (Seller Central consent page),
 *   then Login with Amazon (LWA) code exchange. Docs: developer-docs.amazon/sp-api/docs/website-authorization-workflow
 * - Orders: Orders API 2026-01-01 `searchOrders` (v0 getOrders is deprecated).
 *   Buyer and recipient data are never requested (no PII).
 * - India is served by the Europe endpoint.
 */
export const AMAZON_IN_MARKETPLACE_ID = "A21TJRUUN4KGV";
const SELLER_CENTRAL = "https://sellercentral.amazon.in";
const SP_API_HOST = "https://sellingpartnerapi-eu.amazon.com";
const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const INITIAL_LOOKBACK_DAYS = 30;
const PAGE_SIZE = 100;
/** Re-read a small overlap so updates landing during a sync are not missed. */
const OVERLAP_MS = 2 * 60_000;

export type AmazonConfig = {
  appId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Draft (unpublished) apps must add version=beta to the consent URL. */
  draftApp: boolean;
};

const cursorSchema = z.object({
  lastUpdatedAfter: z.string().datetime({ offset: true }),
  paginationToken: z.string().min(1).optional(),
  /** Time the current window started being read; becomes the next lower bound. */
  windowStartedAt: z.string().datetime({ offset: true }).optional(),
});
export type AmazonCursor = z.infer<typeof cursorSchema>;

function mapStatus(order: AmazonOrder): NormalizedOrderStatus {
  const status = order.fulfillment?.fulfillmentStatus;
  switch (status) {
    case "PENDING":
    case "PENDING_AVAILABILITY":
      return "PENDING";
    case "UNSHIPPED":
      return "CONFIRMED";
    case "PARTIALLY_SHIPPED":
      return "SHIPPED";
    case "SHIPPED": {
      const packages = order.packages ?? [];
      const delivered = packages.length > 0 && packages.every((p) => p.packageStatus?.status === "DELIVERED");
      return delivered ? "DELIVERED" : "SHIPPED";
    }
    case "CANCELLED":
    case "UNFULFILLABLE":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

function breakdownAmount(item: AmazonOrderItem, type: string): Decimal | null {
  const entry = item.proceeds?.breakdowns?.find((b) => b.type === type);
  return entry ? parseAmount(entry.subtotal.amount) : null;
}

function mapItem(item: AmazonOrderItem): NormalizedItem {
  const unitPrice = parseAmount(item.product?.price?.unitPrice?.amount);
  const itemGross = breakdownAmount(item, "ITEM");
  // Amazon's sign convention for DISCOUNT is not documented; treat it as a magnitude.
  const discount = breakdownAmount(item, "DISCOUNT")?.abs() ?? null;
  const gross = itemGross ?? (unitPrice ? unitPrice.mul(item.quantityOrdered) : null);
  return {
    externalItemId: item.orderItemId,
    sku: item.product?.sellerSku ?? null,
    productRef: item.product?.asin ?? null,
    title: item.product?.title ?? null,
    quantity: item.quantityOrdered,
    unitPrice,
    lineValue: gross ? gross.sub(discount ?? 0) : null,
    discount,
    providerStatus: null,
  };
}

function currencyOf(order: AmazonOrder): string {
  for (const item of order.orderItems) {
    const code = item.product?.price?.unitPrice?.currencyCode ?? item.proceeds?.proceedsTotal?.currencyCode;
    if (code) return code;
  }
  return "INR";
}

export function normalizeAmazonOrder(order: AmazonOrder): NormalizedOrder {
  return {
    externalOrderId: order.orderId,
    orderedAt: new Date(order.createdTime),
    providerUpdatedAt: new Date(order.lastUpdatedTime),
    status: mapStatus(order),
    providerStatus: order.fulfillment?.fulfillmentStatus ?? "UNKNOWN",
    fulfilledBy: order.fulfillment?.fulfilledBy ?? null,
    currency: currencyOf(order),
    items: order.orderItems.map(mapItem),
  };
}

export class AmazonAdapter implements MarketplaceAdapter<AmazonCursor> {
  readonly id = "amazon" as const;
  readonly code = "AMAZON" as const;
  readonly displayName = "Amazon Seller Central";

  constructor(
    private readonly config: AmazonConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly sleep?: (ms: number) => Promise<void>,
  ) {}

  authorizationUrl(state: string): string {
    const url = new URL("/apps/authorize/consent", SELLER_CENTRAL);
    url.searchParams.set("application_id", this.config.appId);
    url.searchParams.set("state", state);
    if (this.config.draftApp) url.searchParams.set("version", "beta");
    return url.toString();
  }

  parseCallback(params: URLSearchParams): CallbackResult {
    const state = params.get("state");
    const code = params.get("spapi_oauth_code");
    if (!state) return { ok: false, reason: "invalid_request", state: null };
    if (!code) return { ok: false, reason: params.has("error") ? "denied" : "invalid_request", state };
    return { ok: true, code, state, externalSellerId: params.get("selling_partner_id") };
  }

  private async token(values: Record<string, string>): Promise<TokenSet> {
    const json = await requestJson(
      LWA_TOKEN_URL,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: formBody({ ...values, client_id: this.config.clientId, client_secret: this.config.clientSecret }),
      },
      { provider: "amazon", fetchImpl: this.fetchImpl, retries: 2, sleep: this.sleep },
    );
    const parsed = lwaTokenResponseSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError("bad_response", null, "amazon");
    return {
      accessToken: parsed.data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
      refreshToken: parsed.data.refresh_token ?? null,
      refreshTokenExpiresAt: null,
    };
  }

  // Amazon's LWA exchange does not take `state`; it was already verified by the caller.
  exchangeCode(code: string): Promise<TokenSet> {
    return this.token({ grant_type: "authorization_code", code, redirect_uri: this.config.redirectUri });
  }

  refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    return this.token({ grant_type: "refresh_token", refresh_token: refreshToken });
  }

  parseCursor(raw: unknown): AmazonCursor | null {
    const parsed = cursorSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async fetchOrdersPage(args: { accessToken: string; cursor: AmazonCursor | null; now: Date }): Promise<OrdersPage<AmazonCursor>> {
    const cursor: AmazonCursor = args.cursor ?? {
      lastUpdatedAfter: new Date(args.now.getTime() - INITIAL_LOOKBACK_DAYS * 86_400_000).toISOString(),
    };
    const windowStartedAt = cursor.windowStartedAt ?? args.now.toISOString();
    const url = new URL("/orders/2026-01-01/orders", SP_API_HOST);
    url.searchParams.set("marketplaceIds", AMAZON_IN_MARKETPLACE_ID);
    url.searchParams.set("lastUpdatedAfter", cursor.lastUpdatedAfter);
    url.searchParams.set("maxResultsPerPage", String(PAGE_SIZE));
    // Only non-personal datasets. BUYER and RECIPIENT are deliberately excluded.
    url.searchParams.set("includedData", "FULFILLMENT,PROCEEDS,PACKAGES");
    if (cursor.paginationToken) url.searchParams.set("paginationToken", cursor.paginationToken);

    const json = await requestJson(
      url.toString(),
      {
        method: "GET",
        headers: { "x-amz-access-token": args.accessToken, "user-agent": "MarginMint/0.1 (Language=TypeScript)" },
      },
      { provider: "amazon", fetchImpl: this.fetchImpl, sleep: this.sleep },
    );
    const parsed = searchOrdersResponseSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError("bad_response", null, "amazon");

    const orders = parsed.data.orders
      .filter((o) => !o.salesChannel.marketplaceId || o.salesChannel.marketplaceId === AMAZON_IN_MARKETPLACE_ID)
      .map(normalizeAmazonOrder);
    const nextToken = parsed.data.pagination?.nextToken;
    if (nextToken) {
      return { orders, next: { ...cursor, paginationToken: nextToken, windowStartedAt }, resumeFrom: null };
    }
    // Window complete: next sync reads changes since this window began (minus overlap).
    const lowerBound = parsed.data.lastUpdatedBefore ?? new Date(new Date(windowStartedAt).getTime() - OVERLAP_MS).toISOString();
    return { orders, next: null, resumeFrom: { lastUpdatedAfter: lowerBound } };
  }

  summarize(order: Pick<NormalizedOrder, "status" | "providerStatus">, items: NormalizedItem[]): OrderSummary {
    return {
      status: order.status ?? "PENDING",
      providerStatus: order.providerStatus ?? "UNKNOWN",
      units: items.reduce((n, i) => n + i.quantity, 0),
      itemValue: sumOrNull(items.map((i) => i.lineValue)),
      discount: sumOrNull(items.map((i) => i.discount ?? new Decimal(0))),
    };
  }
}
