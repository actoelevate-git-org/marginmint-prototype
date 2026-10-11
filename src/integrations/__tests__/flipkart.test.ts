import { describe, expect, it, vi } from "vitest";
import { deriveFlipkartOrderStatus, FLIPKART_SEGMENTS, FlipkartAdapter, groupFlipkartItems, parseFlipkartDate } from "../flipkart/adapter";
import type { FetchLike } from "../http";

const config = { clientId: "fk-client", clientSecret: "fk-secret", redirectUri: "https://app.test/api/integrations/flipkart/callback" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};
const now = new Date("2026-10-11T08:40:00Z");

function item(overrides: Record<string, unknown> = {}) {
  return {
    orderItemId: "OI-1",
    orderId: "OD330417005797",
    status: "APPROVED",
    orderDate: "2026-10-10T14:05:00",
    sku: "MM-103",
    fsn: "TSHFSN0001",
    quantity: 2,
    priceComponents: { sellingPrice: 1198, totalPrice: 1238, shippingCharge: 40, customerPrice: 1198 },
    ...overrides,
  };
}

describe("FlipkartAdapter auth", () => {
  it("builds the authorization URL", () => {
    const url = new URL(new FlipkartAdapter(config).authorizationUrl("st"));
    expect(url.toString().startsWith("https://api.flipkart.net/oauth-service/oauth/authorize?")).toBe(true);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("Seller_Api");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("st");
  });

  it("exchanges the code with HTTP Basic client authentication and the real state", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ access_token: "a", refresh_token: "r", expires_in: 5183999, refresh_token_expires_in: 10703805 }));
    const tokens = await new FlipkartAdapter(config, fetchImpl, noSleep).exchangeCode("c0de", "st");
    const [rawUrl, init] = fetchImpl.mock.calls[0] ?? [];
    const url = new URL(String(rawUrl));
    expect(url.pathname).toBe("/oauth-service/oauth/token");
    expect(url.searchParams.get("grant_type")).toBe("authorization_code");
    expect(url.searchParams.get("state")).toBe("st");
    expect((init?.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("fk-client:fk-secret").toString("base64")}`);
    expect(tokens.refreshTokenExpiresAt).not.toBeNull();
  });
});

describe("FlipkartAdapter orders", () => {
  it("walks every filter segment over a rolling window, following nextPageUrl", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation(async () => json({ hasMore: false, shipments: [] }));
    fetchImpl.mockResolvedValueOnce(json({ hasMore: true, nextPageUrl: "/v3/shipments/filter/?pageId=2", shipments: [{ orderItems: [item()] }] }));
    const adapter = new FlipkartAdapter(config, fetchImpl, noSleep);
    let cursor = null;
    let pages = 0;
    for (;;) {
      const page = await adapter.fetchOrdersPage({ accessToken: "a", cursor, now });
      pages += 1;
      if (!page.next) {
        expect(page.resumeFrom).toBeNull();
        break;
      }
      cursor = page.next;
    }
    expect(pages).toBe(FLIPKART_SEGMENTS.length + 1);
    const first = fetchImpl.mock.calls[0];
    expect(first?.[0]).toBe("https://api.flipkart.net/sellers/v3/shipments/filter/");
    const body = JSON.parse(String(first?.[1]?.body));
    expect(body.filter.type).toBe("preDispatch");
    expect(body.filter.orderDate.from).toBe("2026-09-11T14:10:00+05:30");
    expect(body.pagination.pageSize).toBe(20);
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://api.flipkart.net/sellers/v3/shipments/filter/?pageId=2");
    const types = fetchImpl.mock.calls.slice(2).map((c) => JSON.parse(String(c[1]?.body)).filter);
    expect(types.map((f) => f.cancellationType ?? f.shipmentTypes?.[0] ?? f.type)).toEqual([
      "NORMAL", "SELF", "marketplaceCancellation", "sellerCancellation", "buyerCancellation",
    ]);
  });

  it("refuses a nextPageUrl on another host", async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const adapter = new FlipkartAdapter(config, fetchImpl, noSleep);
    await expect(
      adapter.fetchOrdersPage({ accessToken: "a", now, cursor: { from: "x", to: "y", segment: 0, nextPageUrl: "https://evil.test/steal" } }),
    ).rejects.toMatchObject({ kind: "bad_response" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("groups items by order and parses IST dates and float prices to paise", () => {
    const orders = groupFlipkartItems([item(), item({ orderItemId: "OI-2", quantity: 1, priceComponents: { sellingPrice: 499.995 } }), item({ orderId: "OD2", orderItemId: "OI-3" })]);
    expect(orders).toHaveLength(2);
    expect(orders[0]?.items).toHaveLength(2);
    expect(orders[0]?.orderedAt.toISOString()).toBe("2026-10-10T08:35:00.000Z");
    expect(orders[0]?.items[1]?.lineValue?.toFixed(2)).toBe("500.00");
    expect(orders[0]?.items[0]?.unitPrice?.toFixed(2)).toBe("599.00");
    expect(parseFlipkartDate("2026-10-10T14:05:00Z").toISOString()).toBe("2026-10-10T14:05:00.000Z");
  });

  it("derives order status from item statuses", () => {
    expect(deriveFlipkartOrderStatus(["APPROVED", "PACKED"])).toBe("CONFIRMED");
    expect(deriveFlipkartOrderStatus(["SHIPPED", "READY_TO_DISPATCH"])).toBe("SHIPPED");
    expect(deriveFlipkartOrderStatus(["DELIVERED", "CANCELLED"])).toBe("DELIVERED");
    expect(deriveFlipkartOrderStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED");
    expect(deriveFlipkartOrderStatus(["DELIVERED", "RETURNED"])).toBe("RETURNED");
    expect(deriveFlipkartOrderStatus(["SOMETHING_NEW"])).toBe("PENDING");
  });

  it("excludes cancelled items from value and units unless the whole order is cancelled", () => {
    const adapter = new FlipkartAdapter(config);
    const [order] = groupFlipkartItems([item({ status: "DELIVERED" }), item({ orderItemId: "OI-2", status: "CANCELLED", quantity: 1, priceComponents: { sellingPrice: 500 } })]);
    const summary = adapter.summarize(order!, order!.items);
    expect(summary.status).toBe("DELIVERED");
    expect(summary.units).toBe(2);
    expect(summary.itemValue?.toFixed(2)).toBe("1198.00");
    expect(summary.discount).toBeNull();
  });
});
