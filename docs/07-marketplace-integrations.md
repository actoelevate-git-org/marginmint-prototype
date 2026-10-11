# 7. Marketplace integrations (Amazon & Flipkart)

> **Status:** built and covered by tests against each provider's **published** API formats. It has **not yet been run against a live seller account** because no developer credentials exist yet. Section 7.9 is the checklist for the first live test.

## 7.1 What it does

1. A seller clicks **Connect** on the Integrations page.
2. They approve access **on the marketplace's own website**. MarginMint never sees their password.
3. MarginMint stores encrypted tokens and can then **sync orders** into PostgreSQL.
4. Synced orders appear in **Orders → Synced from marketplaces**.

No buyer names, emails, phone numbers or addresses are requested or stored.

## 7.2 Code map

| File | Role |
|------|------|
| `src/integrations/types.ts` | The `MarketplaceAdapter` interface every provider implements, plus normalized types (`NormalizedOrder`, `NormalizedItem`, `TokenSet`, `OrdersPage`) |
| `src/integrations/http.ts` | `requestJson`: timeout (8 s), retries on 429/5xx with exponential backoff honouring `Retry-After`, `ProviderError` with a safe `kind` |
| `src/integrations/money.ts` | `parseAmount` (string or number → 2 dp `Decimal`), `sumOrNull` |
| `src/integrations/amazon/adapter.ts` · `schemas.ts` | Amazon adapter + Zod schemas |
| `src/integrations/flipkart/adapter.ts` · `schemas.ts` | Flipkart adapter + Zod schemas |
| `src/services/integrations/registry.ts` | Builds an adapter from env vars, or reports missing variable names |
| `src/services/integrations/context.ts` | Wires adapter + repository + encryption key + workspace for a request |
| `src/services/integrations/oauth.ts` | `startAuthorization`, `completeAuthorization`, `disconnect` |
| `src/services/integrations/sync.ts` | `syncOrders`: the sync engine |
| `src/services/integrations/status.ts` | Connection status for the Integrations page |
| `src/services/integrations/synced-orders.ts` | Query + format synced orders for the Orders tab |
| `src/services/integrations/connected.ts` | Which providers are connected (decides the Orders tab default) |
| `src/app/api/integrations/[provider]/*` | `connect` (POST), `callback` (GET), `sync` (POST), `disconnect` (POST) |
| `src/components/integrations/*` | Marketplace card, result notice, pending-state form |
| `src/components/orders/*` | Source tabs + synced orders table |

## 7.3 The adapter interface

```ts
interface MarketplaceAdapter<Cursor> {
  id: "amazon" | "flipkart";
  code: "AMAZON" | "FLIPKART";
  authorizationUrl(state: string): string;                     // consent page URL
  parseCallback(params: URLSearchParams): CallbackResult;      // read code/state from the redirect
  exchangeCode(code: string, state: string): Promise<TokenSet>;
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;
  parseCursor(raw: unknown): Cursor | null;                    // validate stored sync position
  fetchOrdersPage(args: { accessToken; cursor; now }): Promise<OrdersPage<Cursor>>;
  summarize(order, items): OrderSummary;                       // order status/totals from all stored items
}
```

`OrdersPage` returns `next` (continue this run) or `resumeFrom` (where the next run should start once this window is done). Everything provider-specific stays inside the adapter.

## 7.4 Amazon (Selling Partner API)

| Item | Value |
|------|-------|
| Consent page | `https://sellercentral.amazon.in/apps/authorize/consent?application_id=…&state=…` (+ `version=beta` for Draft apps) |
| Callback params | `state`, `spapi_oauth_code`, `selling_partner_id` |
| Token endpoint | `POST https://api.amazon.com/auth/o2/token`, form-encoded (`grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`) |
| Code lifetime | 5 minutes; the whole flow must finish within ~10 minutes |
| Access token | ~1 hour; refreshed with `grant_type=refresh_token` |
| API host | `https://sellingpartnerapi-eu.amazon.com` (India is served by the **Europe** region) |
| Marketplace ID | `A21TJRUUN4KGV` (Amazon.in) |
| Orders API | **`GET /orders/2026-01-01/orders`** (`searchOrders`). The older `v0` operations are **deprecated**. |
| Request | `marketplaceIds`, `lastUpdatedAfter`, `maxResultsPerPage=100`, `includedData=FULFILLMENT,PROCEEDS,PACKAGES`, `paginationToken` |
| Auth header | `x-amz-access-token: <access token>` |
| Rate limit | 0.0056 req/s, burst 20 (handled by retry/backoff + resumable sync) |
| Personal data | `BUYER` and `RECIPIENT` datasets are **never requested** (tested) |

**Sync window.** The first sync reads orders updated in the last **30 days**. When a window completes, the next sync starts from the response's `lastUpdatedBefore`, or from the window start minus a 2-minute overlap. Updated orders (e.g. newly shipped) are picked up again and upserted.

**Status mapping**

| Amazon `fulfillmentStatus` | MarginMint status |
|----------------------------|-------------------|
| `PENDING`, `PENDING_AVAILABILITY` | Pending |
| `UNSHIPPED` | Confirmed |
| `PARTIALLY_SHIPPED` | Shipped |
| `SHIPPED` | Shipped, or **Delivered** if every package status is `DELIVERED` |
| `CANCELLED`, `UNFULFILLABLE` | Cancelled |

The raw Amazon status is stored too (`providerStatus`) and shown under the badge.

**Money.** Item value = `ITEM` proceeds − |`DISCOUNT`|, excluding tax. If there are no proceeds yet, unit price × quantity is used. If there is no price either, the value is `null` ("Not priced yet").

## 7.5 Flipkart (Marketplace Seller API)

| Item | Value |
|------|-------|
| Authorize | `https://api.flipkart.net/oauth-service/oauth/authorize?client_id&redirect_uri&response_type=code&scope=Seller_Api&state` |
| Callback params | `code`, `state` |
| Token endpoint | `/oauth-service/oauth/token` with **HTTP Basic** client auth; query params `grant_type`, `code`, `redirect_uri`, `state` |
| Token lifetime | Access ~60 days (`expires_in` 5183999), refresh ~124 days |
| Orders API | `POST /sellers/v3/shipments/filter/` (Order Management v3), page size 20, then GET `nextPageUrl` |
| Auth header | `Authorization: Bearer <access token>` |
| Sandbox | Set `FLIPKART_API_HOST=https://sandbox-api.flipkart.net` |

**Why a rolling window?** Flipkart's filter API has **no "updated since" field**. Each sync therefore re-reads a **rolling 30-day window** of order dates across **six filter segments** and upserts the results:

| # | `filter.type` | States / extra fields |
|---|---------------|-----------------------|
| 1 | `preDispatch` | APPROVED, PACKING_IN_PROGRESS, PACKED, FORM_FAILED, READY_TO_DISPATCH |
| 2 | `postDispatch` | SHIPPED, DELIVERED, PICKUP_COMPLETE · `shipmentTypes: ["NORMAL"]` |
| 3 | `postDispatch` | same · `shipmentTypes: ["SELF"]` (Flipkart requires NORMAL and SELF separately) |
| 4 | `cancelled` | CANCELLED · `cancellationType: marketplaceCancellation` |
| 5 | `cancelled` | CANCELLED · `sellerCancellation` |
| 6 | `cancelled` | CANCELLED · `buyerCancellation` |

**Items and status.** Flipkart returns order **items** inside shipments. Items are grouped by `orderId`. Because an order's items can arrive in different segments or pages, the sync engine **merges** them into the stored order and then derives the order status:

| Item status | Maps to |
|-------------|---------|
| APPROVED, PACKING_IN_PROGRESS, PACKED, FORM_FAILED, READY_TO_DISPATCH | Confirmed |
| PICKUP_COMPLETE, SHIPPED | Shipped |
| DELIVERED, RETURN_REQUESTED | Delivered |
| RETURNED | Returned |
| CANCELLED | Cancelled |
| anything unknown | Pending |

Order status rules: if every item is cancelled → Cancelled; otherwise cancelled items are ignored and **Returned > all Delivered → Delivered > any Shipped/Delivered → Shipped > Confirmed**. Cancelled items are excluded from units and value unless the whole order is cancelled.

**Dates.** Flipkart timestamps without a timezone are **IST** and are parsed as `+05:30`.

**`nextPageUrl` safety.** Absolute URLs must be on the configured Flipkart host, otherwise they are rejected. This prevents a malicious response from sending our bearer token elsewhere (tested). Relative URLs are resolved under `/sellers`.

### ⚠️ Flipkart details to verify in the sandbox

Flipkart's public docs are incomplete. These assumptions are marked `VERIFY IN SANDBOX` at the top of `flipkart/adapter.ts`:

1. The token endpoint method (docs show `curl` with query params, i.e. GET).
2. The exact refresh-token grant parameters (standard OAuth `grant_type=refresh_token` is assumed).
3. Whether `nextPageUrl` is absolute, host-relative, or relative to `/sellers` (all three are handled).
4. Whether `priceComponents.sellingPrice` covers the **whole line quantity** (assumed yes).
5. Whether the `orderDate` filter applies to the post-dispatch and cancelled segments.

## 7.6 The OAuth flow and its protections

```
POST /api/integrations/{provider}/connect
  ├─ reject unless Origin is our own site               → 403
  ├─ not configured?                                    → back to /integrations?result=not_configured
  ├─ create 256-bit random `state`; store SHA-256(state), expires in 10 min
  ├─ set httpOnly cookie mm_oauth_{provider}=state (SameSite=Lax, path=/api/integrations/{provider}/callback)
  └─ 303 → marketplace consent page

GET /api/integrations/{provider}/callback
  ├─ cookie must equal `state` (constant-time compare)   else state_mismatch
  ├─ consume state atomically (single use, not expired)  else state_expired
  ├─ seller declined?                                    → denied (state still consumed)
  ├─ exchange code for tokens                            else token_exchange_failed
  ├─ require a refresh token
  ├─ encrypt both tokens (AES-256-GCM) and save the connection
  └─ clear the cookie; 303 → /integrations?result=connected
```

Why each protection exists:
- **Connect is POST-only.** Next.js prefetches `<Link>` targets, and a GET would create OAuth state on every page view. GET returns 405.
- **Cookie binding** stops *login CSRF*: an attacker can't trick your browser into finishing a flow they started, which would attach **their** seller account to your workspace.
- **Hashed state.** A database leak does not reveal usable states.
- **Atomic single use.** A conditional `UPDATE … WHERE consumedAt IS NULL` lets only one request win, even under concurrency (tested against real Postgres).
- **`Referrer-Policy: no-referrer`** on these responses, as Amazon recommends.

## 7.7 The sync engine (`syncOrders`)

```
1. Load the connection. Not connected / reconnect required → stop.
2. Start a SyncRun unless another run for this connection started < 5 min ago   → already_running
3. Get an access token: reuse if valid for > 5 more minutes, else refresh (and save, encrypted)
4. Loop over pages until done, or 8 pages, or 8 seconds:
     a. fetchOrdersPage(cursor)
     b. de-duplicate orders within the page (merge their items)
     c. load the stored versions of those orders in ONE query
     d. merge items, recompute status/units/value (adapter.summarize)
     e. save the whole page in ONE transaction (bulk upsert)
     f. save the cursor              ← a crash later never loses progress
5. Record the outcome on the SyncRun and the connection
```

| Outcome | When | Effect |
|---------|------|--------|
| `completed` | Window fully read | Next run starts from `resumeFrom` |
| `partial` | Page or time budget reached | Cursor saved; run sync again to continue |
| `rate_limited` | 429 after retries | Progress kept; try again later |
| `reauth_required` | 401/403 from the provider | Connection marked **Reconnect required** |
| `failed` | Other provider error | Progress up to the last page kept |
| `already_running` | Concurrent run | Nothing happens |
| `not_connected` | No active connection | Nothing happens |

**Why budgets?** Netlify functions have short time limits. Each run does a bounded amount of work and resumes next time, so no single request runs too long.

**Why batching?** The first version saved one order at a time (~7 database round trips each). Over a 230 ms link to the Neon region, a 100-order page took about 2.5 minutes. Batched, it takes **~1.8 seconds** (measured).

**Idempotency.** Orders are unique on `(workspaceId, provider, externalOrderId)`, and items are replaced per order. Running the same sync twice updates; it never duplicates (tested).

## 7.8 What the user sees

**Integrations page: marketplace card states**

| State | Shown when | Actions |
|-------|-----------|---------|
| **Not configured** | Env vars missing | Disabled Connect + list of missing variable **names** |
| **Database unavailable** | DB unreachable | Explanation |
| **Not connected** | Configured, never connected | Connect |
| **Connected** | Tokens stored | Sync orders now · View orders · Disconnect… (with confirmation) |
| **Reconnect required** | Provider rejected our token | Reconnect |
| **Disconnected** | User disconnected | Connect; previously synced orders are kept |

Card details include seller ID (Amazon), orders synced, connected time and last sync status.

**Result messages.** Routes redirect with an allow-listed `result` code (`connected`, `denied`, `state_mismatch`, `state_expired`, `token_exchange_failed`, `sync_completed`, `sync_partial`, `sync_rate_limited`, `sync_reauth_required`, `sync_failed`, `disconnected`…). `components/integrations/result-notice.tsx` maps each code to a fixed message. Unknown codes show nothing, so no provider or attacker-controlled text is ever reflected into the page.

**Orders tab.** "Synced from marketplaces" is the default once any marketplace is connected. It has the same date/marketplace filters, status tabs with counts, search (order ID or exact SKU), sorting and pagination as the demo view, plus per-provider **Sync** buttons. Each row shows the MarginMint status **and** the raw marketplace status. Unpriced orders show "—" with "Not priced yet by the marketplace". Shopify/D2C filters explain that only Amazon and Flipkart sync today.

**Disconnect** deletes the stored tokens and keeps synced orders, still labelled by source.

## 7.9 Checklist for the first live test

- [ ] Amazon app registered with the Orders role; redirect URI = `{APP_URL}/api/integrations/amazon/callback`
- [ ] `AMAZON_SPAPI_DRAFT_APP=true` (the app is in Draft)
- [ ] Connect → consent page opens on `sellercentral.amazon.in`
- [ ] Callback returns `connected`; the card shows your seller ID
- [ ] Sync → orders appear; spot-check 5 orders against Seller Central (date, status, item value, units)
- [ ] Run sync twice → "updated", never duplicates
- [ ] Revoke the app in Seller Central → next sync shows **Reconnect required**
- [ ] Flipkart in the **sandbox** first; confirm each item in the "verify in sandbox" list (7.5)
- [ ] Remove `version=beta` (`AMAZON_SPAPI_DRAFT_APP=false`) only after the app is **published**

## 7.10 Adding a new provider (e.g. Shopify)

1. Create `src/integrations/shopify/adapter.ts` implementing `MarketplaceAdapter` (+ Zod schemas).
2. Add `"SHOPIFY"` to the `MarketplaceProvider` enum in `prisma/schema.prisma` and create a migration.
3. Add the env vars to `lib/env.ts › missingConfig` and `.env.example`.
4. Register it in `services/integrations/registry.ts` (`PROVIDER_IDS`, `PROVIDER_CODE`, `resolveAdapter`).
5. Add copy in `components/integrations/marketplace-card.tsx` and remove the static Shopify card from `services/integration-cards.ts`.
6. Add the provider to `SYNCED_PROVIDER_LABEL` and the marketplace-to-provider mapping in `services/integrations/synced-orders.ts`, and to `ProviderCode` in `integrations/types.ts`.
7. Write adapter tests with fixtures based on the provider's published schema (see `__tests__/amazon.test.ts`).

The OAuth flow, sync engine, repository logic and API routes need **no changes**.
