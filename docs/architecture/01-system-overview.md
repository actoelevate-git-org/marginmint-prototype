# 1. System overview

## 1.1 System context: who and what talks to MarginMint

![1.1 System context: who and what talks to MarginMint (diagram)](../diagrams/architecture-01-system-overview-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    seller(["👤 Seller<br/>(browser)"])
    dev(["👩‍💻 Engineer"])

    subgraph mm["MarginMint (Next.js on Netlify)"]
        app["Web app<br/>pages + API routes"]
    end

    neon[("Neon PostgreSQL<br/>connections, synced orders")]

    subgraph amazon["Amazon"]
        sc["Seller Central India<br/>sellercentral.amazon.in<br/>(consent page)"]
        lwa["Login with Amazon<br/>api.amazon.com/auth/o2/token"]
        spapi["Selling Partner API (EU)<br/>sellingpartnerapi-eu.amazon.com"]
    end

    subgraph flipkart["Flipkart"]
        fkauth["OAuth service<br/>api.flipkart.net/oauth-service"]
        fkapi["Seller API v3<br/>api.flipkart.net/sellers"]
    end

    seller -- "HTTPS: dashboard, connect, sync" --> app
    seller -- "approves access" --> sc
    seller -- "approves access" --> fkauth
    app -- "TLS (verify-full)" --> neon
    app -- "code → tokens, refresh" --> lwa
    app -- "searchOrders" --> spapi
    app -- "code → tokens, refresh" --> fkauth
    app -- "shipments/filter" --> fkapi
    dev -- "git push → build" --> mm
```

</details>

- The seller **never gives MarginMint a marketplace password**; they approve access on the marketplace's own site.
- MarginMint holds only **encrypted OAuth tokens** and **order data without buyer personal information**.
- Analytics pages (Overview, Profit Analytics, …) still run on an **in-memory demo dataset** and do not touch Neon or the marketplaces yet.

## 1.2 Containers: what runs where

![1.2 Containers: what runs where (diagram)](../diagrams/architecture-01-system-overview-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    browser["Browser<br/>React 19 (server-rendered HTML + small client islands:<br/>charts, filters, mobile nav, pending forms)"]

    subgraph netlify["Netlify"]
        cdn["CDN / static assets<br/>(JS, CSS, fonts)"]
        subgraph fn["Serverless functions (Next.js 15 runtime)"]
            pages["Server-rendered pages<br/>src/app/(app)/*"]
            reports["CSV export route<br/>/api/reports/[report]"]
            integ["Integration routes<br/>/api/integrations/[provider]/connect · callback · sync · disconnect"]
        end
    end

    demo[("Demo dataset<br/>in-memory, deterministic seed<br/>src/data/demo")]
    neon[("Neon PostgreSQL 18<br/>us-east-2 · pooled URL for app<br/>direct URL for migrations")]
    amz["Amazon SP-API + LWA"]
    fk["Flipkart Seller API + OAuth"]

    browser --> cdn
    browser --> pages
    browser --> reports
    browser --> integ
    pages --> demo
    reports --> demo
    pages -- "Orders tab (synced), Integrations status" --> neon
    integ --> neon
    integ --> amz
    integ --> fk
```

</details>

| Container | Technology | Notes |
|-----------|-----------|-------|
| Web app | Next.js 15 App Router, React 19, TypeScript 6 strict, Tailwind 3, Recharts 3 | Server components by default; URL holds all filter state |
| Serverless functions | Netlify's Next.js runtime | Short time limits → sync is bounded (8 pages / 8 s) and resumable |
| Demo dataset | TypeScript module, mulberry32 seed `20261011` | Built once per process; ledger cached in a `WeakMap` |
| Database | Neon PostgreSQL 18, Prisma 7.10 + `pg` driver adapter | No native engine binary; pool `max: 3` per instance |
| Amazon | LWA OAuth + SP-API Orders `2026-01-01` | India served by the EU endpoint |
| Flipkart | OAuth (authorization code) + Order Management v3 | Rolling 30-day window, six filter segments |

## 1.3 Deployment & environments

![1.3 Deployment & environments (diagram)](../diagrams/architecture-01-system-overview-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    subgraph local["💻 Local development"]
        devsrv["npm run dev<br/>localhost:3000"]
        envl[".env.local<br/>(gitignored, mode 600)"]
        devsrv -.reads.-> envl
    end

    subgraph gh["GitHub"]
        repo["actoelevate-git-org/<br/>marginmint-prototype"]
    end

    subgraph nf["Netlify"]
        build["Build: npm run build<br/>= prisma generate && next build<br/>Node 22"]
        site["Deployed site<br/>env vars set in Netlify UI"]
        build --> site
    end

    neon[("Neon<br/>dev database")]

    devsrv -- "git push" --> repo
    repo -- "webhook" --> build
    devsrv -- "pooled URL" --> neon
    devsrv -- "npm run db:migrate<br/>(direct URL)" --> neon
    site -. "🔜 once login exists" .-> neon
```

</details>

| Environment | Database | Marketplace credentials | Notes |
|-------------|----------|-------------------------|-------|
| Local | Neon dev DB (migrated ✅) | Not yet issued | Demo + synced orders tab (empty until connected) |
| Netlify (current) | None configured | None | Demo-only; integration cards show "Not configured" |
| Netlify (future) | Production Neon DB | Production apps | **Only after login exists** (see [Security](08-security-architecture.md)) |

**Configuration** is read only on the server via `src/lib/env.ts` (Zod). Missing values degrade a feature to "Not configured" instead of crashing; the UI lists the missing variable **names** (never values).
