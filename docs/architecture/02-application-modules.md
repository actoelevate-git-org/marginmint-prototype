# 2. Application modules

## 2.1 Module dependency map

Arrows point from the caller to what it depends on. Dependencies only point **inward/downward**; inner modules never import outer ones.

![2.1 Module dependency map (diagram)](../diagrams/architecture-02-application-modules-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    subgraph ui["UI layer"]
        pages["Pages<br/>src/app/(app)/*/page.tsx"]
        comps["Components<br/>components/ui · layout · dashboard · charts · orders · integrations"]
    end

    subgraph api["API layer"]
        rReports["/api/reports/[report]"]
        rInteg["/api/integrations/[provider]/*"]
        guards["lib/http/request-guards<br/>(same-origin, safe redirects)"]
    end

    subgraph svc["Service layer (use-cases)"]
        sDash["dashboard"]
        sAnalytics["profitability · inventory · orders<br/>settlements · returns · advertising · reports"]
        sProducts["products"]
        sLedger["ledger ★"]
        sInt["integrations/<br/>oauth · sync · status · synced-orders<br/>connected · context · registry"]
        sWs["workspace"]
    end

    subgraph dom["Domain (pure)"]
        money["money"]
        finance["finance"]
        insights["insights"]
    end

    subgraph adapters["Integration adapters"]
        port["types.ts (MarketplaceAdapter port)"]
        amz["amazon/adapter + schemas"]
        fk["flipkart/adapter + schemas"]
        http["http.ts · money.ts"]
    end

    subgraph repo["Repositories"]
        iface["integration-repository (interface)"]
        prismaRepo["prisma-integration-repository"]
        memRepo["memory-integration-repository (tests)"]
    end

    subgraph lib["Shared lib"]
        libs["dates · search-params · url · pagination · marketplaces<br/>navigation · csv · env · crypto · db"]
    end

    data[("data/demo<br/>seed · catalog")]
    gen[("generated/prisma<br/>Prisma client")]

    pages --> comps
    pages --> sDash & sAnalytics & sInt & sWs
    rReports --> sAnalytics
    rInteg --> guards
    rInteg --> sInt
    sDash --> sLedger & sProducts & insights
    sAnalytics --> sLedger & sProducts
    sProducts --> sLedger
    sLedger --> finance & data
    sInt --> port & iface & sWs
    amz & fk --> port & http
    prismaRepo --> iface & gen
    memRepo --> iface
    finance --> money
    insights --> finance & money
    svc --> libs
    api --> libs
```

</details>

## 2.2 Layer rules (enforced in review)

| Layer | May import | Must never |
|-------|-----------|-----------|
| Pages / components | services (functions + types), `lib`, other components | Add/subtract money, query the DB, call a marketplace |
| API routes | services, `lib/http`, `lib/env` | Hold business logic |
| Services | domain, adapters (through the port), repositories (through the interface), `lib` | Render UI |
| Domain | `decimal.js`, other domain files | Do I/O, import services/repositories/UI |
| Adapters | `http.ts`, `money.ts`, Zod, `lib/env` types | Touch the database or UI |
| Repositories | Prisma client, interface types | Contain formulas |

## 2.3 Request lifecycle (any analytics page)

![2.3 Request lifecycle (diagram)](../diagrams/architecture-02-application-modules-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant N as Next.js (server)
    participant L as (app)/layout.tsx
    participant P as page.tsx
    participant Q as lib/search-params
    participant S as service
    participant C as Client components

    B->>N: GET /profitability?range=7d&marketplace=AMAZON&sort=losses
    N->>L: render shell (workspace name, last sync, filters)
    N->>P: render page with searchParams (Promise)
    P->>Q: parseGlobalFilters + parseEnum/parseSort/parsePage (allow-lists)
    Q-->>P: validated, typed filters (bad input → safe default)
    P->>S: getProfitabilityView(filters)
    S-->>P: display-ready model (formatted ₹ strings, chart numbers)
    P-->>N: server-rendered HTML
    N-->>B: HTML stream (loading.tsx skeleton first if slow)
    B->>C: hydrate charts / filters / mobile nav only
    C->>B: filter change → router.push(new URL) → repeat
```

</details>

## 2.4 Route map

| Route | Type | Rendering | Data |
|-------|------|-----------|------|
| `/` | Redirect | Static | → `/overview` |
| `/overview`, `/profitability`, `/products`, `/settlements`, `/returns`, `/advertising`, `/reports` | Page | Dynamic (search params) | Demo ledger |
| `/orders` | Page | Dynamic | Demo **or** Neon (`?source=synced`) |
| `/orders/[orderId]` | Page | Dynamic | Demo |
| `/integrations` | Page | Dynamic (`force-dynamic`) | Env + Neon |
| `/settings` | Page | Static | Config constants |
| `/api/reports/[report]` | GET | Function | Demo ledger → CSV |
| `/api/integrations/[provider]/connect` | POST | Function | Neon + redirect to marketplace |
| `/api/integrations/[provider]/callback` | GET | Function | Marketplace → token exchange → Neon |
| `/api/integrations/[provider]/sync` | POST | Function | Marketplace → Neon |
| `/api/integrations/[provider]/disconnect` | POST | Function | Neon |
