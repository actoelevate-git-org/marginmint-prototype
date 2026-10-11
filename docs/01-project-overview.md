# 1. Project overview

## 1.1 The product in one paragraph

Indian sellers sell on Amazon, Flipkart, Shopify and their own websites (D2C). Each channel has its own dashboard, fees and payout schedule, so sellers rarely know their **real profit**. A product can sell well and still lose money once commission, shipping, advertising and returns are counted. MarginMint pulls this data together and answers questions such as:

- How much profit did I actually make this month?
- Which products lose money after advertising?
- Which products will run out of stock soon?
- Did the marketplace pay me what it owed?
- How much are returns costing me?

**Product principle:** *Revenue is not profit. Make every cost visible.*

**Tagline:** *Every Sale. Every Cost. Your Real Profit.*

## 1.2 Who uses it

- Amazon India and Flipkart sellers
- Shopify store owners and D2C brands
- Small and medium businesses selling on several marketplaces at once

## 1.3 Current status at a glance

| Area | Status | Data source |
|------|--------|-------------|
| App shell, navigation, design system | ✅ Built | — |
| Overview dashboard (KPIs, charts, insights) | ✅ Built | Demo data |
| Profit Analytics, Products & Inventory, Settlements, Returns, Advertising, Reports | ✅ Built (read-only) | Demo data |
| CSV exports (9 reports) | ✅ Built | Demo data |
| Amazon & Flipkart connect (OAuth) | ✅ Built, **not yet tested with real credentials** | Live marketplace |
| Order sync into the Orders tab | ✅ Built | Live marketplace → Neon PostgreSQL |
| Database (Prisma 7 + Neon) | ✅ Built, migration applied to the dev database | — |
| App login / user accounts | ❌ Not built | — |
| CSV import, settlement matching workflow, product editing | ❌ Not built | — |
| Synced orders feeding the dashboard and profit pages | ❌ Not built (dashboard still uses demo data) | — |
| Shopify integration | ❌ Not built | — |

### The most important thing to understand

There are **two separate data worlds** in the app today:

1. **Demo data:** a deterministic, in-memory dataset generated from a fixed seed (`src/data/demo/`). Every analytics page uses it. It is labelled "Demo workspace" everywhere.
2. **Synced data:** real orders pulled from Amazon/Flipkart and stored in PostgreSQL. Only the **Orders** tab can show these, under a "Synced from marketplaces" switch.

They are deliberately **never mixed** in one list. Connecting synced data to the dashboard is the next big piece of work (see [Roadmap](12-known-gaps-and-roadmap.md)).

## 1.4 The ten sections of the app

All ten sidebar links open a working page. Routes live in `src/app/(app)/`.

| Section | Route | What it shows | Filters |
|---------|-------|---------------|---------|
| Overview | `/overview` | 6 KPI cards, revenue vs profit chart, profit waterfall, marketplace comparison, "Needs your attention" insights | Date + marketplace |
| Profit Analytics | `/profitability` | Per-product profit with every cost column, sortable, reconciles to the workspace total | Date + marketplace |
| Reports | `/reports` | 9 CSV reports with row counts and metric definitions | Date + marketplace |
| Orders | `/orders`, `/orders/[orderId]` | Demo **or** synced orders; status tabs, search, sort, pagination; order detail page (demo) | Date + marketplace |
| Products & Inventory | `/products` | Stock, inventory value, unit contribution, days of cover, low-stock view | None (stock is a snapshot) |
| Settlements | `/settlements` | Expected vs received payouts, differences, review status | Date + marketplace |
| Returns | `/returns` | Return rate, refund value, losses, reasons, by product and channel | Date + marketplace |
| Advertising | `/advertising` | Campaign spend, attributed sales, ROAS, ACOS | Date + marketplace |
| Integrations | `/integrations` | Amazon/Flipkart connect and sync status, other data sources | None |
| Settings | `/settings` | Workspace info, insight thresholds, accounting policies, rate card (read-only) | None |

## 1.5 Technology stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | Next.js 15 (App Router) | Server components by default; route handlers for APIs |
| Language | TypeScript 6, strict mode | `noUncheckedIndexedAccess` is on |
| UI | React 19, Tailwind CSS 3, Radix primitives, Lucide icons | No component library; our own primitives in `src/components/ui/` |
| Charts | Recharts 3 | Palette validated for colour-blind accessibility |
| Money | `decimal.js` behind a `Money` class | Never JS floats |
| Validation | Zod 4 | URL params, env vars, provider API responses |
| Database | PostgreSQL on Neon, Prisma 7 with the `pg` driver adapter | Only marketplace connections and synced orders today |
| Tests | Vitest 5 | 102 unit/service tests + 4 opt-in real-database tests |
| Hosting | Netlify | `netlify.toml`; Next.js runtime auto-detected |

## 1.6 Repository layout (top level)

```
marginmint/
├── docs/                ← you are here
├── prisma/              ← schema + SQL migrations
├── src/
│   ├── app/             ← Next.js routes (pages + API route handlers)
│   ├── components/      ← React components (ui, layout, dashboard, charts, orders, integrations)
│   ├── data/demo/       ← seeded demo dataset
│   ├── domain/          ← pure financial logic + insight rules (no I/O)
│   ├── integrations/    ← Amazon & Flipkart adapters (HTTP, OAuth, payload mapping)
│   ├── lib/             ← shared utilities (dates, env, crypto, csv, db, url params…)
│   ├── repositories/    ← database access (Prisma + in-memory for tests)
│   ├── services/        ← use-cases that pages and routes call
│   └── generated/       ← Prisma client (generated, gitignored)
├── AGENTS.md            ← short contributor guide
├── MarginMint.md        ← full product specification
├── prisma.config.ts     ← Prisma CLI config
└── netlify.toml         ← deploy config
```

A deeper map is in [Architecture](03-architecture.md#32-folder-map).
