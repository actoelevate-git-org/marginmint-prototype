# MarginMint — Agent Guide

## Product

MarginMint is a SaaS platform for e-commerce seller operations and **profit intelligence**: orders, costs, fees, settlements, inventory, and marketplace imports—presented as a premium B2B analytics product (INR-first demo currency).

## Repository status

Phase 1 (UI on seeded demo data) is implemented. There is **no database, auth, or marketplace integration yet**; all data comes from a deterministic in-memory seed.

### Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 · Radix primitives · Lucide · Recharts 3
- `decimal.js` money via `src/domain/money.ts` (integer paise, half-up rounding) · Zod for URL/input parsing
- Vitest for unit/service tests. Prisma/PostgreSQL, Auth.js and Playwright are **not installed yet**

### Layout

- `src/data/demo/` — seeded records only (never computes KPIs)
- `src/domain/` — money, profit formulas, insight rules (pure, tested)
- `src/services/` — `ledger.ts` normalises records into facts; every page/report aggregates through it
- `src/lib/` — dates (IST day keys), URL param parsing, CSV (formula-injection safe), pagination
- `src/components/{ui,layout,dashboard,charts}` — reusable UI; `src/app/(app)/*` — one route per nav item
- `src/app/api/reports/[report]` — CSV exports

## Essential commands

- `npm install` · `npm run dev` · `npm run build` · `npm start`
- `npm run typecheck` · `npm run lint` · `npm test`

## Cursor rules

Detailed, actionable rules live in [`.cursor/rules/`](.cursor/rules/):

| File | Scope |
|------|--------|
| `project-standards.mdc` | Always on — change discipline, honesty, reuse |
| `financial-logic.mdc` | Always on — money math and profit definitions |
| `database-security.mdc` | Always on — authz, secrets, transactions, audit |
| `architecture.mdc` | Source files — layering and contracts |
| `typescript.mdc` | `*.ts` / `*.tsx` — strict typing |
| `ui-ux.mdc` | UI files — visual identity and UX states |
| `testing.mdc` | Test / e2e paths — verification standards |
| `integrations-csv.mdc` | Integration / CSV paths — adapters and imports |

## Non-negotiables

1. **Financial correctness** — no float money math; incomplete COGS is unknown, not zero; settlements ≠ sales
2. **Security** — verify workspace membership server-side; no secrets in the browser
3. **Verification honesty** — run available checks; never claim green results without evidence
4. **Complete interactions** — no fake controls unless explicitly labeled incomplete
