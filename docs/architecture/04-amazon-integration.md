# 4. Amazon integration architecture

**Status:** 🧪 built and tested against Amazon's published API model; not yet run against a live seller account (no developer credentials yet).

| Fact | Value |
|------|-------|
| API | Selling Partner API (SP-API) |
| Auth | Login with Amazon (LWA) OAuth 2.0, website authorization workflow |
| Orders API | **`2026-01-01` `searchOrders`** (v0 `getOrders` is deprecated) |
| Region / host | Europe: `https://sellingpartnerapi-eu.amazon.com` (serves Amazon.in) |
| Marketplace | Amazon.in, `A21TJRUUN4KGV` |
| Consent page | `https://sellercentral.amazon.in/apps/authorize/consent` |
| Token endpoint | `POST https://api.amazon.com/auth/o2/token` |
| Code | `src/integrations/amazon/adapter.ts`, `schemas.ts` · shared: `services/integrations/*` |

## 4.1 Components and boundaries

![4.1 Components and boundaries (diagram)](../diagrams/architecture-04-amazon-integration-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    seller(["👤 Seller"])

    subgraph mm["MarginMint server"]
        connect["POST /api/integrations/amazon/connect"]
        callback["GET /api/integrations/amazon/callback"]
        sync["POST /api/integrations/amazon/sync"]
        oauth["services/integrations/oauth.ts"]
        engine["services/integrations/sync.ts"]
        adapter["AmazonAdapter<br/>integrations/amazon/adapter.ts"]
        cipher["token-cipher<br/>AES-256-GCM"]
    end

    db[("Neon<br/>OAuthState · MarketplaceConnection<br/>ExternalOrder · ExternalOrderItem · SyncRun")]

    subgraph amz["Amazon"]
        sc["Seller Central India<br/>consent page"]
        lwa["LWA token service<br/>api.amazon.com"]
        sp["SP-API EU<br/>Orders 2026-01-01"]
    end

    seller --> connect --> oauth
    oauth --> db
    connect -. "303 redirect" .-> sc
    seller -- "Allow" --> sc
    sc -. "redirect with code" .-> callback
    callback --> oauth --> adapter
    adapter -- "authorization_code / refresh_token" --> lwa
    oauth --> cipher --> db
    seller --> sync --> engine --> adapter
    adapter -- "x-amz-access-token" --> sp
    engine --> db
```

</details>

## 4.2 One-time setup (done by the MarginMint team, not by sellers)

![4.2 One-time setup (diagram)](../diagrams/architecture-04-amazon-integration-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    a["1. Register as an SP-API developer<br/>(developer profile via Seller Central / Solution Provider Portal)"]
    b["2. Create an app<br/>role: Orders only (no restricted/PII roles)"]
    c["3. Configure OAuth redirect URI<br/>{APP_URL}/api/integrations/amazon/callback"]
    d["4. Copy credentials to server env<br/>AMAZON_SPAPI_APP_ID<br/>AMAZON_LWA_CLIENT_ID · AMAZON_LWA_CLIENT_SECRET"]
    e{"App state?"}
    f["Draft: AMAZON_SPAPI_DRAFT_APP=true<br/>consent URL gets version=beta<br/>(limited test authorisations)"]
    g["Published in Selling Partner Appstore<br/>AMAZON_SPAPI_DRAFT_APP=false<br/>any seller can authorise"]
    a --> b --> c --> d --> e
    e -- "testing" --> f
    e -- "after Amazon review" --> g
```

</details>

> Publishing requires Amazon's app review and compliance with Amazon's data-protection requirements. We only implement the **website** authorization flow (starts on our site). An Appstore-initiated flow would also need a "login URI" endpoint (🔜 not built).

## 4.3 Connect: authorization sequence

![4.3 Connect: authorization sequence (diagram)](../diagrams/architecture-04-amazon-integration-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    autonumber
    actor S as Seller (browser)
    participant C as /connect (POST)
    participant O as oauth.ts
    participant DB as Neon
    participant SC as sellercentral.amazon.in
    participant CB as /callback (GET)
    participant A as AmazonAdapter
    participant LWA as api.amazon.com/auth/o2/token

    S->>C: POST (Origin: our site)
    C->>C: isSameOrigin? else 403
    C->>O: startAuthorization()
    O->>DB: upsert Workspace
    O->>DB: insert OAuthState{ stateHash: SHA-256(state), expiresAt: now+10m }
    C-->>S: 303 Location: /apps/authorize/consent?application_id=…&state=…[&version=beta]<br/>Set-Cookie: mm_oauth_amazon=state (httpOnly, SameSite=Lax, 10 min)
    S->>SC: open consent page, sign in, click "Confirm"
    SC-->>S: 302 → {APP_URL}/api/integrations/amazon/callback?state=…&selling_partner_id=…&spapi_oauth_code=…
    S->>CB: GET (cookie attached)
    CB->>O: completeAuthorization(params, cookie)
    O->>O: cookie == state (constant-time)? else state_mismatch
    O->>DB: UPDATE OAuthState SET consumedAt=now WHERE hash=? AND consumedAt IS NULL AND expiresAt>now
    Note over O,DB: exactly one request can win (single use)
    O->>A: exchangeCode(spapi_oauth_code)
    A->>LWA: POST form: grant_type=authorization_code, code, redirect_uri, client_id, client_secret
    LWA-->>A: { access_token, refresh_token, token_type: bearer, expires_in: 3600 }
    A-->>O: TokenSet (Zod-validated)
    O->>DB: upsert MarketplaceConnection{ AMAZON, externalSellerId, refreshTokenEnc, accessTokenEnc, expiresAt, status CONNECTED, syncState NULL }
    CB-->>S: 303 /integrations?provider=amazon&result=connected (cookie cleared)
```

</details>

**Timing limits from Amazon:** `spapi_oauth_code` expires after **5 minutes**; the whole flow should finish within about 10 minutes. Our own state expires after 10 minutes.

## 4.4 Token lifecycle

![4.4 Token lifecycle (diagram)](../diagrams/architecture-04-amazon-integration-04.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
stateDiagram-v2
    [*] --> NotConnected
    NotConnected --> Connected: callback success · (refresh + access token stored encrypted)
    Connected --> Connected: sync with access token · valid > 5 more min
    Connected --> Refreshing: access token expired · or < 5 min left
    Refreshing --> Connected: LWA grant_type=refresh_token · new access token saved (encrypted)
    Refreshing --> ReauthRequired: LWA 401, 403 or 400 invalid_grant (seller revoked access)
    Connected --> ReauthRequired: SP-API 401 / 403
    ReauthRequired --> Connected: seller reconnects
    Connected --> Disconnected: user disconnects · (tokens deleted, orders kept)
    Disconnected --> Connected: reconnect
```

</details>

Access tokens last ~1 hour. The refresh token is long-lived and is only ever stored as AES-256-GCM ciphertext.

> **Revoked access:** OAuth token services reject a revoked refresh token with **HTTP 400 `invalid_grant`**. `integrations/http.ts` reads only the standard OAuth `error` code and classifies `invalid_grant` as `unauthorized`, so the connection switches to **Reconnect required** (roadmap I-07, tested end to end with the Amazon adapter). Confirm the exact LWA response during the first live test.

## 4.5 Order sync sequence

![4.5 Order sync sequence (diagram)](../diagrams/architecture-04-amazon-integration-05.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    autonumber
    actor S as Seller
    participant R as /sync (POST)
    participant E as sync.ts
    participant DB as Neon
    participant A as AmazonAdapter
    participant SP as sellingpartnerapi-eu.amazon.com

    S->>R: POST (same origin)
    R->>E: syncOrders()
    E->>DB: getConnection(AMAZON) · tryStartSyncRun (lock)
    E->>E: access token valid? else refresh via LWA
    loop until done, or 8 pages, or 8 s
        E->>A: fetchOrdersPage(cursor)
        A->>SP: GET /orders/2026-01-01/orders?marketplaceIds=A21TJRUUN4KGV<br/>&lastUpdatedAfter=…&maxResultsPerPage=100<br/>&includedData=FULFILLMENT,PROCEEDS,PACKAGES[&paginationToken=…]
        Note right of SP: BUYER and RECIPIENT datasets<br/>are never requested
        SP-->>A: { orders[], pagination.nextToken?, lastUpdatedBefore? }
        A->>A: Zod validate → normalize orders (status, money)
        A-->>E: { orders, next | resumeFrom }
        E->>DB: getOrders(ids) (1 query)
        E->>DB: saveOrders(page) (bulk upsert, 1 transaction)
        E->>DB: updateConnection(syncState = cursor)
    end
    E->>DB: finishSyncRun · lastSyncAt / status / message
    R-->>S: 303 /integrations?result=sync_completed&created=…&updated=…
```

</details>

### Cursor (stored in `MarketplaceConnection.syncState`)

![Cursor (diagram)](../diagrams/architecture-04-amazon-integration-06.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    first["First sync<br/>lastUpdatedAfter = now − 30 days"] --> page["fetch page"]
    page -- "nextToken present" --> cont["cursor = { lastUpdatedAfter, paginationToken, windowStartedAt }<br/>(continue this run or the next)"]
    cont --> page
    page -- "no nextToken" --> done["window complete<br/>resumeFrom = { lastUpdatedAfter: response.lastUpdatedBefore<br/>?? windowStartedAt − 2 min }"]
    done --> next["next sync reads only orders<br/>updated since then"]
```

</details>

`lastUpdatedAfter` (not `createdAfter`) is used so status changes on older orders are picked up. Amazon requires exactly one of the two.

## 4.6 Data mapping

![4.6 Data mapping (diagram)](../diagrams/architecture-04-amazon-integration-07.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    subgraph amzOrder["Amazon Order"]
        oid["orderId"]
        ct["createdTime"]
        lut["lastUpdatedTime"]
        fs["fulfillment.fulfillmentStatus"]
        fb["fulfillment.fulfilledBy"]
        pk["packages[].packageStatus.status"]
        mid["salesChannel.marketplaceId"]
    end
    subgraph amzItem["Amazon OrderItem"]
        iid["orderItemId"]
        qty["quantityOrdered"]
        sku["product.sellerSku"]
        asin["product.asin"]
        title["product.title"]
        up["product.price.unitPrice.amount"]
        pitem["proceeds.breakdowns[type=ITEM]"]
        pdisc["proceeds.breakdowns[type=DISCOUNT]"]
    end
    subgraph ours["ExternalOrder / ExternalOrderItem"]
        eoid["externalOrderId"]
        oat["orderedAt"]
        put["providerUpdatedAt"]
        st["status + providerStatus"]
        fby["fulfilledBy"]
        lv["lineValue = ITEM − |DISCOUNT|<br/>(fallback unitPrice × qty, else null)"]
        dsc["discount"]
        it["externalItemId · quantity · sku · productRef · title · unitPrice"]
    end
    oid --> eoid
    ct --> oat
    lut --> put
    fs --> st
    pk --> st
    fb --> fby
    mid -. "filter: only A21TJRUUN4KGV" .-> eoid
    pitem --> lv
    pdisc --> lv
    pdisc --> dsc
    up --> lv
    iid & qty & sku & asin & title & up --> it
```

</details>

Tax breakdowns are deliberately ignored (GST is not revenue). Amounts arrive as **decimal strings** and are parsed exactly.

### Status mapping

![Status mapping (diagram)](../diagrams/architecture-04-amazon-integration-08.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    P1["PENDING"] --> Pend["Pending"]
    P2["PENDING_AVAILABILITY"] --> Pend
    U["UNSHIPPED"] --> Conf["Confirmed"]
    PS["PARTIALLY_SHIPPED"] --> Ship["Shipped"]
    S["SHIPPED"] -- "not all packages DELIVERED" --> Ship
    S -- "all packages DELIVERED" --> Del["Delivered"]
    C["CANCELLED"] --> Can["Cancelled"]
    UF["UNFULFILLABLE"] --> Can
```

</details>

The raw Amazon status is always kept in `providerStatus` and shown under the badge.

## 4.7 Errors, retries and rate limits

| Situation | Handling | User sees |
|-----------|----------|-----------|
| 429 Too Many Requests | Retry up to 3× with backoff (honours `Retry-After`, max 10 s) | If still limited: "rate limit reached, progress saved" |
| 5xx / network | Retry up to 3×, timeout 8 s per request | "sync failed, progress up to last page saved" |
| 401 / 403 | No retry → connection `REAUTH_REQUIRED` | "Reconnect required" + Reconnect button |
| Refresh rejected with 400 `invalid_grant` | Classified as unauthorized → connection `REAUTH_REQUIRED` | "Reconnect required" + Reconnect button |
| Response fails Zod validation | `bad_response`, nothing saved for that page | "sync failed" |
| Code exchange fails / no refresh token | Nothing saved | "did not issue access tokens; check redirect URI and credentials" |

Default `searchOrders` rate: **0.0056 requests/second, burst 20**. Bursting up to 8 pages per run is within the burst budget; the resumable cursor handles the rest.

## 4.8 First live test checklist

See [Integrations §7.9](../07-marketplace-integrations.md#79-checklist-for-the-first-live-test).
