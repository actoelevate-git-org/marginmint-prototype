# Architecture diagrams

> **New here?** Start with [10 · Full product architecture](10-full-product-architecture.md) for the big picture, then come back to 1–9 for what is built today.

Diagrams of MarginMint **as it is actually built**: real endpoints, real files, real parameters. Each diagram links to the code it describes. They render on GitHub (Mermaid).

> **Status legend used throughout:** ✅ built and tested · 🧪 built, not yet run against a live account · 🔜 planned

| # | Document | What it shows |
|---|----------|---------------|
| 1 | [System overview](01-system-overview.md) | Context (who and what talks to MarginMint), containers, deployment, environments |
| 2 | [Application modules](02-application-modules.md) | Every module and its dependencies, layer rules, request lifecycle |
| 3 | [Analytics data flow](03-analytics-data-flow.md) | Demo records → ledger → domain formulas → dashboard, reports and insights |
| 4 | [Amazon integration](04-amazon-integration.md) | SP-API developer setup, consent, LWA tokens, Orders API 2026-01-01 sync, mapping |
| 5 | [Flipkart integration](05-flipkart-integration.md) | Seller Hub app setup, OAuth, Shipments v3 segment walk, item grouping, mapping |
| 6 | [Sync engine](06-sync-engine.md) | Shared engine: run lifecycle, cursors, budgets, batching, error outcomes |
| 7 | [Data model](07-data-model.md) | Full PostgreSQL schema with every column, keys and indexes |
| 8 | [Security architecture](08-security-architecture.md) | Trust boundaries, where secrets live, how each attack is stopped |
| 9 | [Target architecture](09-target-architecture.md) | Where the system is heading: login, scheduled sync, analytics on real data |
| 10 | **[Full product architecture](10-full-product-architecture.md)** | **The complete product from the spec on one page:** all 12 bounded contexts, all 22 data models, ingestion and CSV import, order-to-cash, reconciliation engine, profit on real data, insight lifecycle, background jobs, auth and roles, deployment, cross-cutting rules, build status by phase |

Narrative explanations live in the main [docs](../README.md); these pages are the visual companion.
