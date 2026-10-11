# MarginMint — Agent Guide

## Product

MarginMint is a SaaS platform for e-commerce seller operations and **profit intelligence**: orders, costs, fees, settlements, inventory, and marketplace imports—presented as a premium B2B analytics product (INR-first demo currency).

## Repository status

Phase 1 (UI on seeded demo data) is implemented, plus Amazon and Flipkart order sync (OAuth + Prisma/Neon). Dashboard, reports and other pages still use the deterministic demo seed; only the Orders tab shows synced orders. **There is no app authentication yet**: `getCurrentWorkspace()` returns a fixed workspace and must resolve the signed-in member's workspace once auth lands.

### Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 · Radix primitives · Lucide · Recharts 3
- `decimal.js` money via `src/domain/money.ts` (integer paise, half-up rounding) · Zod for URL/input parsing
- Prisma 7 (`prisma-client` generator → `src/generated/prisma`, pg driver adapter) on Neon PostgreSQL; config in `prisma.config.ts`
- Vitest for unit/service tests. Auth.js and Playwright are **not installed yet**

### Layout

- `src/data/demo/` — seeded records only (never computes KPIs)
- `src/domain/` — money, profit formulas, insight rules (pure, tested)
- `src/services/` — `ledger.ts` normalises records into facts; every page/report aggregates through it
- `src/lib/` — dates (IST day keys), URL param parsing, CSV (formula-injection safe), pagination
- `src/components/{ui,layout,dashboard,charts}` — reusable UI; `src/app/(app)/*` — one route per nav item
- `src/app/api/reports/[report]` — CSV exports
- `src/integrations/{amazon,flipkart}` — provider adapters behind `integrations/types.ts` (OAuth, order fetch, Zod-validated payloads)
- `src/repositories/` — `IntegrationRepository` with Prisma and in-memory (test) implementations
- `src/services/integrations/` — OAuth state flow, resumable/idempotent sync, status, synced-order listing
- `src/app/api/integrations/[provider]/{connect,callback,sync,disconnect}` — integration routes

## Essential commands

- `npm install` · `npm run dev` · `npm run build` · `npm start`
- `npm run typecheck` · `npm run lint` · `npm test`
- `npm run db:migrate` (apply migrations; needs `DIRECT_DATABASE_URL` or `DATABASE_URL`) · `npm run db:generate`

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
