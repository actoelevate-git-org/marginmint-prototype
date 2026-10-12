# 9. Target architecture

Where the system is heading, based on the product spec ([`MarginMint.md`](../../MarginMint.md)) and the [roadmap](../12-known-gaps-and-roadmap.md). Nothing on this page is built unless marked ✅.

## 9.1 Target containers

![9.1 Target containers (diagram)](../diagrams/architecture-09-target-architecture-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    browser["Browser"]

    subgraph netlify["Netlify"]
        app["Next.js app ✅<br/>pages + API routes"]
        auth["Auth.js 🔜<br/>Google / email sign-in"]
        sched["Scheduled function 🔜<br/>sync every N minutes"]
    end

    subgraph neon["Neon PostgreSQL"]
        core["Connections · synced orders ✅"]
        tenancy["Users · Workspaces · Members 🔜"]
        analytics["Products · costs · fees · settlements<br/>returns · ads · expenses 🔜"]
        audit["Audit log · CSV import jobs · insights 🔜"]
    end

    amz["Amazon SP-API<br/>Orders ✅ · Finances / Settlements 🔜 · FBA inventory 🔜"]
    fk["Flipkart Seller API<br/>Shipments ✅ · Payments 🔜 · Returns 🔜"]
    shop["Shopify Admin API 🔜"]

    browser --> auth --> app
    app --> core & tenancy & analytics & audit
    sched --> core
    sched --> amz & fk & shop
    app --> amz & fk & shop
```

</details>

## 9.2 Target request path (with login)

![9.2 Target request path (diagram)](../diagrams/architecture-09-target-architecture-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    actor U as Signed-in user
    participant MW as Auth middleware 🔜
    participant P as Page / route
    participant W as getCurrentWorkspace() 🔜
    participant DB as Neon

    U->>MW: request + session cookie
    MW->>MW: valid session? else redirect to /login
    MW->>P: request + user id
    P->>W: resolve workspace
    W->>DB: WorkspaceMember where userId = ? and workspaceId = ?
    DB-->>W: membership + role (or none → 403)
    W-->>P: workspace id (server-derived, never from the request)
    P->>DB: every query scoped by workspaceId ✅ (already true today)
```

</details>

## 9.3 Target analytics data flow

![9.3 Target analytics data flow (diagram)](../diagrams/architecture-09-target-architecture-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    subgraph sources["Sources"]
        demo["Demo seed ✅<br/>(separate demo workspace)"]
        sync["Marketplace sync ✅ orders<br/>🔜 fees, settlements, returns, inventory"]
        csv["CSV imports 🔜<br/>mapping · validation · dedupe"]
        manual["Manual entry 🔜<br/>unit costs, expenses"]
    end
    db[("Neon<br/>normalized, workspace-scoped")]
    ledger["Ledger ✅ (in-memory today)<br/>🔜 reads facts from the database"]
    domain["Domain formulas ✅<br/>unchanged"]
    pages["Dashboard · Profit · Reports ✅<br/>unchanged"]
    sources --> db --> ledger --> domain --> pages
```

</details>

**Design intent:** the domain formulas and pages stay unchanged; only the ledger's data source moves from the in-memory seed to the database. This is why the ledger exists.

## 9.4 Migration path

| Step | Change | Unblocks |
|------|--------|----------|
| 1 | Auth.js + `User`/`WorkspaceMember`; `getCurrentWorkspace()` from session | Real deployment with real data |
| 2 | First live Amazon (Draft) + Flipkart sandbox run; fix differences | Trustworthy sync |
| 3 | Scheduled sync (Netlify Scheduled Functions) | Always-fresh orders |
| 4 | Persist products & unit costs; map synced SKUs to products | Real COGS → real profit |
| 5 | Import fees and settlements (Amazon Finances, Flipkart payments) | Real net profit + reconciliation |
| 6 | Ledger reads from the database | Dashboard on real data |
| 7 | CSV import, settlement matching workflow, audit log | Operational workflows from the spec |
| 8 | Shopify adapter | Third marketplace |
