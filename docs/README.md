# MarginMint — Engineering Documentation

> **Who this is for:** engineers joining the project. It assumes you know TypeScript, React and basic SQL, but nothing about this codebase or e-commerce accounting.

MarginMint is a profit-intelligence SaaS for Indian e-commerce sellers. It brings orders, costs, fees, settlements, returns and inventory into one place and shows **real profit**, not just revenue.

---

## Reading order

If you are new, read these in order. Budget about 90 minutes for the whole set.

| # | Document | Read it to learn… | Time |
|---|----------|-------------------|------|
| 1 | [Project overview](01-project-overview.md) | What the product does, what exists today, what does not | 10 min |
| 2 | [Getting started](02-getting-started.md) | How to run it locally, every env var, every command | 10 min |
| 3 | [Architecture](03-architecture.md) | Layers, folder map, how a request flows through the code | 15 min |
| 4 | [Financial logic](04-financial-logic.md) | Money handling, profit formulas, accounting policies | 15 min |
| 5 | [Demo data](05-demo-data.md) | The seeded "Acme Commerce India" workspace | 5 min |
| 6 | [UI & design system](06-ui-design-system.md) | Tokens, components, charts, UX rules | 10 min |
| 7 | [Marketplace integrations](07-marketplace-integrations.md) | Amazon & Flipkart OAuth and order sync, in depth | 15 min |
| 8 | [Database](08-database.md) | Schema, migrations, Prisma 7 specifics, pitfalls | 10 min |
| 9 | [Security](09-security.md) | What is protected, how, and the known gaps | 5 min |
| 10 | [Testing & quality](10-testing-and-quality.md) | Test suites and how to verify a change | 5 min |
| 11 | [Work log](11-work-log.md) | Everything built so far, in order, with the reasons | 10 min |
| 12 | [Known gaps & roadmap](12-known-gaps-and-roadmap.md) | Limitations and what to build next | 5 min |

## The five rules you must not break

These come from [`AGENTS.md`](../AGENTS.md) and [`.cursor/rules/`](../.cursor/rules/). Code review will reject changes that break them.

1. **Never use JavaScript `number` for money.** Use the `Money` class in `src/domain/money.ts` (integer paise + `decimal.js`).
2. **Unknown is not zero.** A missing cost makes profit *unknown* (`null`), never `₹0`.
3. **Settlements are not sales.** Payouts are cash movements. Never add them to revenue.
4. **No financial formulas in UI components.** Formulas live in `src/domain/`. Pages only display values that services have already calculated.
5. **No fake buttons and no fake connections.** If something does not work, disable it and say why. Never show "Connected" unless a real token exchange succeeded.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (redirects to /overview)
npm test             # 102 unit/service tests
```

No database or credentials are needed for the demo. See [Getting started](02-getting-started.md) to enable marketplace sync.

## Where else to look

| Source | What it contains |
|--------|------------------|
| [`MarginMint.md`](../MarginMint.md) | The original full product specification (long; the "north star") |
| [`AGENTS.md`](../AGENTS.md) | Short agent/contributor guide: stack, layout, commands |
| [`.cursor/rules/`](../.cursor/rules/) | Detailed coding rules: finance, security, TypeScript, UI, testing, integrations |
| [`.env.example`](../.env.example) | Every environment variable, documented |
