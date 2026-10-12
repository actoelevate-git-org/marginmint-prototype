# 5. Flipkart integration architecture

**Status:** 🧪 built and tested against Flipkart's published API reference; not yet run against a live seller account or the sandbox. Five behaviours the public docs don't fully specify are isolated and marked **VERIFY IN SANDBOX** (see §5.8).

| Fact | Value |
|------|-------|
| API | Flipkart Marketplace Seller API (v3) |
| Auth | OAuth 2.0 **authorization-code** flow (third-party application) |
| Authorize | `https://api.flipkart.net/oauth-service/oauth/authorize` |
| Token | `https://api.flipkart.net/oauth-service/oauth/token` (HTTP Basic client auth) |
| Orders | `POST https://api.flipkart.net/sellers/v3/shipments/filter/` then `GET nextPageUrl` |
| Scope | `Seller_Api` |
| Sandbox | `FLIPKART_API_HOST=https://sandbox-api.flipkart.net` |
| Code | `src/integrations/flipkart/adapter.ts`, `schemas.ts` · shared: `services/integrations/*` |

## 5.1 Components and boundaries

![5.1 Components and boundaries (diagram)](../diagrams/architecture-05-flipkart-integration-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    seller(["👤 Seller"])

    subgraph mm["MarginMint server"]
        connect["POST /api/integrations/flipkart/connect"]
        callback["GET /api/integrations/flipkart/callback"]
        sync["POST /api/integrations/flipkart/sync"]
        oauth["oauth.ts"]
        engine["sync.ts"]
        adapter["FlipkartAdapter"]
        guard["nextPageUrl origin guard"]
    end

    db[("Neon")]

    subgraph fk["Flipkart (api.flipkart.net or sandbox)"]
        authz["/oauth-service/oauth/authorize<br/>(seller logs in on seller.flipkart.com)"]
        token["/oauth-service/oauth/token"]
        ship["/sellers/v3/shipments/filter/"]
    end

    seller --> connect --> oauth --> db
    connect -. "303 redirect" .-> authz
    seller -- "Allow" --> authz
    authz -. "redirect ?code&state" .-> callback
    callback --> oauth --> adapter
    adapter -- "Basic client_id:secret" --> token
    seller --> sync --> engine --> adapter
    adapter -- "Bearer token" --> guard --> ship
    engine --> db
```

</details>

## 5.2 One-time setup (MarginMint team)

![5.2 One-time setup (diagram)](../diagrams/architecture-05-flipkart-integration-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    a["1. Flipkart Seller Hub → developer access<br/>create a THIRD-PARTY application<br/>(authorization-code flow)"]
    b["2. Register redirect URI<br/>{APP_URL}/api/integrations/flipkart/callback"]
    c["3. Server env<br/>FLIPKART_CLIENT_ID · FLIPKART_CLIENT_SECRET"]
    d{"Environment"}
    e["Sandbox<br/>FLIPKART_API_HOST=https://sandbox-api.flipkart.net<br/>(Flipkart requires sandbox testing before going live)"]
    f["Production<br/>FLIPKART_API_HOST unset → api.flipkart.net"]
    a --> b --> c --> d
    d -- "first" --> e
    d -- "after sandbox sign-off" --> f
```

</details>

> A *self-access* application (client-credentials grant) only works for the app owner's own account and is **not** used: MarginMint connects other sellers' accounts.

## 5.3 Connect: authorization sequence

![5.3 Connect: authorization sequence (diagram)](../diagrams/architecture-05-flipkart-integration-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    autonumber
    actor S as Seller (browser)
    participant C as /connect (POST)
    participant O as oauth.ts
    participant DB as Neon
    participant AZ as Flipkart authorize
    participant CB as /callback (GET)
    participant F as FlipkartAdapter
    participant TK as Flipkart token

    S->>C: POST (same origin)
    C->>O: startAuthorization()
    O->>DB: insert OAuthState{ SHA-256(state), +10 min }
    C-->>S: 303 → /oauth-service/oauth/authorize?client_id&redirect_uri&response_type=code&scope=Seller_Api&state<br/>Set-Cookie: mm_oauth_flipkart=state (httpOnly)
    S->>AZ: log in on seller.flipkart.com, click Allow
    AZ-->>S: redirect → /api/integrations/flipkart/callback?code=…&state=…
    S->>CB: GET (cookie attached)
    CB->>O: completeAuthorization()
    O->>O: cookie == state? · consume state atomically (single use)
    O->>F: exchangeCode(code, state)
    F->>TK: GET /oauth-service/oauth/token?grant_type=authorization_code&code&redirect_uri&state<br/>Authorization: Basic base64(client_id:client_secret)
    TK-->>F: { access_token, refresh_token, expires_in≈5183999 (~60 d), refresh_token_expires_in≈10703805 (~124 d) }
    O->>DB: upsert MarketplaceConnection{ FLIPKART, tokens encrypted, expiries }
    CB-->>S: 303 /integrations?provider=flipkart&result=connected
```

</details>

Flipkart does not return a seller ID in the token response, so the card shows "Seller ID: Not provided".

## 5.4 Why a rolling window and six segments

Flipkart's filter API has **no "modified since" filter**, and each request filters by one shipment state group. So every sync:

1. Re-reads all orders with an **order date in the last 30 days** (rolling window).
2. Walks **six filter segments** in order, paging through each.
3. **Upserts** everything. Re-reading is safe because writes are idempotent.

![5.4 Why a rolling window and six segments (diagram)](../diagrams/architecture-05-flipkart-integration-04.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    start(["sync starts<br/>window = now−30d … now (IST, +05:30)"]) --> s1
    s1["① preDispatch<br/>APPROVED · PACKING_IN_PROGRESS · PACKED<br/>FORM_FAILED · READY_TO_DISPATCH"] --> s2
    s2["② postDispatch · NORMAL<br/>SHIPPED · DELIVERED · PICKUP_COMPLETE"] --> s3
    s3["③ postDispatch · SELF<br/>(must be requested separately)"] --> s4
    s4["④ cancelled<br/>marketplaceCancellation"] --> s5
    s5["⑤ cancelled<br/>sellerCancellation"] --> s6
    s6["⑥ cancelled<br/>buyerCancellation"] --> done(["window complete<br/>next sync starts a fresh window"])
    s1 -. "hasMore → GET nextPageUrl" .-> s1
    s2 -. "hasMore" .-> s2
    s3 -. "hasMore" .-> s3
    s4 -. "hasMore" .-> s4
    s5 -. "hasMore" .-> s5
    s6 -. "hasMore" .-> s6
```

</details>

## 5.5 Order sync sequence (one page)

![5.5 Order sync sequence (diagram)](../diagrams/architecture-05-flipkart-integration-05.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    autonumber
    participant E as sync.ts
    participant F as FlipkartAdapter
    participant G as origin guard
    participant FK as api.flipkart.net
    participant DB as Neon

    E->>F: fetchOrdersPage(cursor = { from, to, segment, nextPageUrl? })
    alt first page of a segment
        F->>FK: POST /sellers/v3/shipments/filter/<br/>{ filter: { type, states, shipmentTypes?/cancellationType?, orderDate:{from,to} }, pagination:{ pageSize: 20 } }
    else continuing a segment
        F->>G: resolve nextPageUrl
        G->>G: absolute URL on another host? → reject (bad_response)<br/>relative → prefix /sellers
        G->>FK: GET {host}/sellers/v3/shipments/filter/?…
    end
    FK-->>F: { hasMore, nextPageUrl, shipments[ { orderItems[] } ] }
    F->>F: Zod validate · flatten orderItems · group by orderId
    F-->>E: orders (items only) + next cursor
    E->>DB: getOrders(ids): load already-stored items
    E->>E: merge items by orderItemId · summarize() derives status/units/value
    E->>DB: saveOrders(page): one bulk upsert transaction
    E->>DB: save cursor
```

</details>

**The origin guard matters.** The `nextPageUrl` comes from the response. If a manipulated response pointed it at another host, we would send the seller's bearer token there. Absolute URLs on any other host are rejected (tested).

## 5.6 Items → orders: grouping, merging and status

Flipkart returns **order items** inside shipments. An order's items can arrive in different segments: one shipped, one cancelled. The engine merges them before deciding the order status:

![5.6 Items → orders: grouping, merging and status (diagram)](../diagrams/architecture-05-flipkart-integration-06.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    subgraph pages["Arrives over the sync"]
        p1["segment ② page: item OI-1 of OD123 · DELIVERED"]
        p2["segment ⑤ page: item OI-2 of OD123 · CANCELLED"]
    end
    p1 --> m["merge with stored items by orderItemId<br/>(services/integrations/sync.ts › mergeItems)"]
    p2 --> m
    m --> d["deriveFlipkartOrderStatus(['DELIVERED','CANCELLED'])"]
    d --> r["Order OD123 → Delivered<br/>units & value exclude the cancelled item<br/>providerStatus = 'DELIVERED, CANCELLED'"]
```

</details>

### Item status → MarginMint status

![Item status → MarginMint status (diagram)](../diagrams/architecture-05-flipkart-integration-07.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    A["APPROVED · PACKING_IN_PROGRESS · PACKED<br/>FORM_FAILED · READY_TO_DISPATCH"] --> Conf["Confirmed"]
    B["PICKUP_COMPLETE · SHIPPED"] --> Ship["Shipped"]
    C["DELIVERED · RETURN_REQUESTED"] --> Del["Delivered"]
    D["RETURNED"] --> Ret["Returned"]
    E["CANCELLED"] --> Can["Cancelled"]
    X["unknown value"] --> Pend["Pending"]
```

</details>

### Order status from all its items

![Order status from all its items (diagram)](../diagrams/architecture-05-flipkart-integration-08.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    q1{"every item cancelled?"} -- yes --> c["Cancelled"]
    q1 -- no --> drop["ignore cancelled items"] --> q2{"any Returned?"}
    q2 -- yes --> ret["Returned"]
    q2 -- no --> q3{"all Delivered?"}
    q3 -- yes --> del["Delivered"]
    q3 -- no --> q4{"any Shipped or Delivered?"}
    q4 -- yes --> sh["Shipped"]
    q4 -- no --> q5{"all unknown?"}
    q5 -- yes --> pe["Pending"]
    q5 -- no --> co["Confirmed"]
```

</details>

## 5.7 Data mapping

| Flipkart field | MarginMint column | Notes |
|----------------|-------------------|-------|
| `orderItems[].orderId` | `ExternalOrder.externalOrderId` | Items grouped by this |
| `orderItems[].orderDate` | `ExternalOrder.orderedAt` | No timezone in the value → parsed as IST (`+05:30`) |
| `orderItems[].orderItemId` | `ExternalOrderItem.externalItemId` | Merge key across pages/segments |
| `orderItems[].status` | `ExternalOrderItem.providerStatus` → order `status` | See 5.6 |
| `orderItems[].sku` | `sku` | |
| `orderItems[].fsn` | `productRef` | Flipkart Serial Number |
| `orderItems[].quantity` | `quantity` | |
| `priceComponents.sellingPrice` | `lineValue`; `unitPrice = lineValue ÷ qty` | JSON **number** → string → `Decimal`, rounded half-up to paise. *Assumed to cover the whole line.* |
| `priceComponents.flipkartDiscount` | not stored as a discount | Funded by Flipkart, not the seller → seller discount = unknown (`null`) |
| `priceComponents.shippingCharge`, `totalPrice` | not used | Customer-paid shipping is not item value |
| *(not provided)* | `title` = null, `fulfilledBy` = null | |

## 5.8 ⚠️ Assumptions to verify in the sandbox

| # | Assumption | Where | If wrong |
|---|-----------|-------|----------|
| 1 | Token endpoint accepts **GET** with query params (docs only show `curl` without `-X`) | `FlipkartAdapter.token()` | Switch to POST with form body |
| 2 | Refresh uses `grant_type=refresh_token&refresh_token=…` | `refreshAccessToken()` | Adjust parameters |
| 3 | `nextPageUrl` format (absolute / host-relative / relative to `/sellers`) | `resolvePageUrl()` | All three handled; confirm which |
| 4 | `sellingPrice` is for the **whole line**, not per unit | `mapItem()` | Multiply by quantity |
| 5 | `orderDate` filter works for post-dispatch and cancelled segments | `FLIPKART_SEGMENTS` | Use `dispatchAfterDate` / `cancellationDate` instead |

A refresh rejected with **400 `invalid_grant`** switches the connection to "Reconnect required" (shared handling in `integrations/http.ts`, roadmap I-07).

## 5.9 Errors and limits

| Situation | Handling |
|-----------|----------|
| 429 / 5xx / network | Up to 3 retries with backoff (honours `Retry-After`), 8 s timeout per request |
| 401 / 403 | Connection → `REAUTH_REQUIRED` |
| Invalid response shape or foreign `nextPageUrl` | `bad_response`, page not saved |
| Page size | 20 (Flipkart maximum); up to 5,000 records per filter |
| Rate limits | Not published in the reference; covered by retry + resumable cursor |
| Returns (`RETURN_REQUESTED`, `RETURNED`) | Not in filter states; needs Flipkart's returns API (🔜) |
