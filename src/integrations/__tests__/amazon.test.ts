import { describe, expect, it, vi } from "vitest";
import { AmazonAdapter, AMAZON_IN_MARKETPLACE_ID } from "../amazon/adapter";
import type { FetchLike } from "../http";

const config = { appId: "amzn1.sp.solution.test", clientId: "amzn1.application-oa2-client.test", clientSecret: "shh", redirectUri: "https://app.test/api/integrations/amazon/callback", draftApp: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};

/** Shaped after the Orders API 2026-01-01 searchOrders response (INR, no buyer data). */
function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    orderId: "408-1234567-7654321",
    createdTime: "2026-10-10T05:30:00Z",
    lastUpdatedTime: "2026-10-10T09:00:00Z",
    salesChannel: { channelName: "AMAZON", marketplaceId: AMAZON_IN_MARKETPLACE_ID, marketplaceName: "Amazon.in" },
    fulfillment: { fulfillmentStatus: "SHIPPED", fulfilledBy: "MERCHANT" },
    packages: [{ packageReferenceId: "1", packageStatus: { status: "DELIVERED" } }],
    orderItems: [
      {
        orderItemId: "11111111111111",
        quantityOrdered: 2,
        product: { asin: "B0TEST0001", title: "Laptop Stand", sellerSku: "MM-104", price: { unitPrice: { amount: "1299.00", currencyCode: "INR" } } },
        proceeds: {
          proceedsTotal: { amount: "2558.00", currencyCode: "INR" },
          breakdowns: [
            { type: "ITEM", subtotal: { amount: "2598.00", currencyCode: "INR" } },
            { type: "DISCOUNT", subtotal: { amount: "-100.00", currencyCode: "INR" } },
            { type: "TAX", subtotal: { amount: "60.00", currencyCode: "INR" } },
          ],
        },
      },
    ],
    ...overrides,
  };
}

describe("AmazonAdapter auth", () => {
  it("builds the India Seller Central consent URL, with version=beta only for draft apps", () => {
    const url = new URL(new AmazonAdapter(config).authorizationUrl("st4te"));
    expect(url.origin).toBe("https://sellercentral.amazon.in");
    expect(url.pathname).toBe("/apps/authorize/consent");
    expect(url.searchParams.get("application_id")).toBe(config.appId);
    expect(url.searchParams.get("state")).toBe("st4te");
    expect(url.searchParams.get("version")).toBe("beta");
    expect(new URL(new AmazonAdapter({ ...config, draftApp: false }).authorizationUrl("s")).searchParams.has("version")).toBe(false);
  });

  it("parses the callback", () => {
    const adapter = new AmazonAdapter(config);
    expect(adapter.parseCallback(new URLSearchParams("state=s&spapi_oauth_code=c&selling_partner_id=A1SELLER"))).toEqual({
      ok: true, code: "c", state: "s", externalSellerId: "A1SELLER",
    });
    expect(adapter.parseCallback(new URLSearchParams("state=s&error=access_denied"))).toMatchObject({ ok: false, reason: "denied" });
    expect(adapter.parseCallback(new URLSearchParams("spapi_oauth_code=c"))).toMatchObject({ ok: false, reason: "invalid_request" });
  });

  it("exchanges the code with LWA using a form-encoded body", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ access_token: "Atza|a", refresh_token: "Atzr|r", token_type: "bearer", expires_in: 3600 }));
    const tokens = await new AmazonAdapter(config, fetchImpl, noSleep).exchangeCode("code123");
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.amazon.com/auth/o2/token");
    expect(init?.method).toBe("POST");
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code123");
    expect(body.get("redirect_uri")).toBe(config.redirectUri);
    expect(body.get("client_id")).toBe(config.clientId);
    expect(tokens.refreshToken).toBe("Atzr|r");
    expect(tokens.accessTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("AmazonAdapter orders", () => {
  const now = new Date("2026-10-11T08:40:00Z");

  it("calls searchOrders on the EU endpoint without personal-data datasets", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ orders: [], lastUpdatedBefore: "2026-10-11T08:38:00Z" }));
    await new AmazonAdapter(config, fetchImpl, noSleep).fetchOrdersPage({ accessToken: "Atza|a", cursor: null, now });
    const [rawUrl, init] = fetchImpl.mock.calls[0] ?? [];
    const url = new URL(String(rawUrl));
    expect(url.origin).toBe("https://sellingpartnerapi-eu.amazon.com");
    expect(url.pathname).toBe("/orders/2026-01-01/orders");
    expect(url.searchParams.get("marketplaceIds")).toBe(AMAZON_IN_MARKETPLACE_ID);
    expect(url.searchParams.get("lastUpdatedAfter")).toBe("2026-09-11T08:40:00.000Z");
    expect(url.searchParams.has("createdAfter")).toBe(false);
    const datasets = url.searchParams.get("includedData") ?? "";
    expect(datasets).not.toMatch(/BUYER|RECIPIENT/);
    expect((init?.headers as Record<string, string>)["x-amz-access-token"]).toBe("Atza|a");
  });

  it("maps orders with decimal money and delivered status", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ orders: [orderFixture()] }));
    const page = await new AmazonAdapter(config, fetchImpl, noSleep).fetchOrdersPage({ accessToken: "a", cursor: null, now });
    const order = page.orders[0];
    expect(order?.externalOrderId).toBe("408-1234567-7654321");
    expect(order?.status).toBe("DELIVERED");
    expect(order?.currency).toBe("INR");
    const item = order?.items[0];
    expect(item?.sku).toBe("MM-104");
    expect(item?.productRef).toBe("B0TEST0001");
    expect(item?.lineValue?.toFixed(2)).toBe("2498.00");
    expect(item?.discount?.toFixed(2)).toBe("100.00");
  });

  it("maps fulfilment statuses", async () => {
    const cases: [string, string][] = [["PENDING", "PENDING"], ["UNSHIPPED", "CONFIRMED"], ["PARTIALLY_SHIPPED", "SHIPPED"], ["CANCELLED", "CANCELLED"]];
    for (const [amazon, ours] of cases) {
      const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ orders: [orderFixture({ fulfillment: { fulfillmentStatus: amazon }, packages: [] })] }));
      const page = await new AmazonAdapter(config, fetchImpl, noSleep).fetchOrdersPage({ accessToken: "a", cursor: null, now });
      expect(page.orders[0]?.status).toBe(ours);
    }
  });

  it("leaves value unknown when Amazon has not priced the order", async () => {
    const unpriced = orderFixture({ orderItems: [{ orderItemId: "1", quantityOrdered: 1, product: { sellerSku: "X" } }] });
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ orders: [unpriced] }));
    const page = await new AmazonAdapter(config, fetchImpl, noSleep).fetchOrdersPage({ accessToken: "a", cursor: null, now });
    expect(page.orders[0]?.items[0]?.lineValue).toBeNull();
    const adapter = new AmazonAdapter(config);
    expect(adapter.summarize(page.orders[0]!, page.orders[0]!.items).itemValue).toBeNull();
  });

  it("paginates, then resumes from lastUpdatedBefore", async () => {
    const fetchImpl = vi.fn<FetchLike>()
      .mockResolvedValueOnce(json({ orders: [orderFixture()], pagination: { nextToken: "NEXT" } }))
      .mockResolvedValueOnce(json({ orders: [], lastUpdatedBefore: "2026-10-11T08:38:00Z" }));
    const adapter = new AmazonAdapter(config, fetchImpl, noSleep);
    const first = await adapter.fetchOrdersPage({ accessToken: "a", cursor: null, now });
    expect(first.next?.paginationToken).toBe("NEXT");
    const second = await adapter.fetchOrdersPage({ accessToken: "a", cursor: first.next, now });
    expect(new URL(String(fetchImpl.mock.calls[1]?.[0])).searchParams.get("paginationToken")).toBe("NEXT");
    expect(second.next).toBeNull();
    expect(second.resumeFrom).toEqual({ lastUpdatedAfter: "2026-10-11T08:38:00Z" });
  });

  it("rejects malformed responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ unexpected: true }));
    await expect(new AmazonAdapter(config, fetchImpl, noSleep).fetchOrdersPage({ accessToken: "a", cursor: null, now })).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("ignores stored cursors it cannot validate", () => {
    const adapter = new AmazonAdapter(config);
    expect(adapter.parseCursor({ lastUpdatedAfter: "yesterday" })).toBeNull();
    expect(adapter.parseCursor({ lastUpdatedAfter: "2026-10-01T00:00:00Z" })).toEqual({ lastUpdatedAfter: "2026-10-01T00:00:00Z" });
  });
});
