# MarginMint product roadmap

> **Generated from `docs/roadmap/roadmap.json` by `npm run roadmap:render`. Do not edit by hand.**
> Steps are ticked ✅ only by the QA gate (`npm run roadmap:verify -- <ID>`). View it nicely at `/internal/roadmap`.

**Progress:** `██████████░░░░░░░░░░` 27 of 54 steps done (50%)

✅ Done: **27** · 🔨 In progress: **1** · ⭐ Next pick: **1** · ⏳ Pending: **18** · ⛔ Blocked: **2** · 🔭 Future: **5**

## 1 · Foundations (7/7)

_Tooling, design system, money math and one calculation path._

| | Step | Status | Verified |
|---|---|---|---|
| ☑ | **F-01** Project tooling & quality gates | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-02** Design system & UI primitives | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-03** App shell, navigation & global filters | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-04** Money & finance domain module | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-05** IST calendar & safe URL parsing | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-06** Deterministic demo dataset | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **F-07** Ledger: one calculation path | ✅ Done | 2026-10-12 · `30fa22b7ef` |

## 2 · Core experience (demo data) (12/12)

_Every section of the app working end to end on demo data._

| | Step | Status | Verified |
|---|---|---|---|
| ☑ | **C-01** Overview KPIs with honest comparisons | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-02** Revenue vs profit chart & profit waterfall | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-03** Marketplace comparison table | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-04** Insight rules engine | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-05** Orders list & order detail (demo) | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-06** Products & inventory view | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-07** Profit Analytics per product | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-08** Settlements view (read-only) | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-09** Returns analytics view | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-10** Advertising view | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-11** Reports & safe CSV exports | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **C-12** Report viewer: on-screen tables, charts & totals | ✅ Done | 2026-10-12 · `30fa22b7ef` |

## 3 · Marketplace integrations (6/13)

_Real orders from Amazon and Flipkart, safely and idempotently._

| | Step | Status | Verified |
|---|---|---|---|
| ☑ | **I-01** Database: Prisma 7 + Neon schema & migrations | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **I-02** Token encryption & OAuth hardening | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **I-03** Amazon SP-API adapter (Orders 2026-01-01) | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **I-04** Flipkart Seller API adapter (Shipments v3) | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **I-05** Sync engine | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **I-06** Integrations page & synced Orders tab | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☐ | **I-07** Revoked access → 'Reconnect required' | 🔨 In progress |  |
| ☐ | **I-08** First live Amazon connection (Draft app) | ⛔ Blocked | Needs Amazon SP-API developer registration and app credentials; real data should not go on a public deployment before login (A-01). |
| ☐ | **I-09** Flipkart sandbox verification | ⛔ Blocked | Needs a Flipkart third-party application and sandbox credentials. |
| ☐ | **I-10** Scheduled background sync | ⏳ Pending |  |
| ☐ | **I-11** Synced order detail page | ⏳ Pending |  |
| ☐ | **I-12** Publish Amazon app to the Appstore | 🔭 Future |  |
| ☐ | **I-13** Shopify adapter | 🔭 Future |  |

## 4 · Accounts & security (0/4)

_Sign-in, workspaces and roles so real data can be deployed safely._

| | Step | Status | Verified |
|---|---|---|---|
| ☐ | **A-01** Authentication (sign-in) | ⭐ Next pick |  |
| ☐ | **A-02** Workspaces, membership & roles | ⏳ Pending |  |
| ☐ | **A-03** Audit log | ⏳ Pending |  |
| ☐ | **A-04** Rate limiting & security headers | ⏳ Pending |  |

## 5 · Real-data financials (0/9)

_Costs, fees and settlements from real data; reconciliation._

| | Step | Status | Verified |
|---|---|---|---|
| ☐ | **D-01** Products & unit costs in the database | ⏳ Pending |  |
| ☐ | **D-02** Order costs from marketplaces | ⏳ Pending |  |
| ☐ | **D-03** Dashboard on real data | ⏳ Pending |  |
| ☐ | **D-04** Settlement data import | ⏳ Pending |  |
| ☐ | **D-05** Settlement matching engine | ⏳ Pending |  |
| ☐ | **D-06** Manual review workflow | ⏳ Pending |  |
| ☐ | **D-07** Expenses entry | ⏳ Pending |  |
| ☐ | **D-08** Returns sync | 🔭 Future |  |
| ☐ | **D-09** Advertising data import | 🔭 Future |  |

## 6 · Operational workflows (0/4)

_Imports, product management and actionable insights._

| | Step | Status | Verified |
|---|---|---|---|
| ☐ | **O-01** CSV import pipeline | ⏳ Pending |  |
| ☐ | **O-02** Product & stock management | ⏳ Pending |  |
| ☐ | **O-03** Insight lifecycle & fee rule | ⏳ Pending |  |
| ☐ | **O-04** Editable settings | 🔭 Future |  |

## 7 · Quality & launch (2/5)

_Docs, verification, end-to-end tests and production readiness._

| | Step | Status | Verified |
|---|---|---|---|
| ☑ | **Q-01** Engineering docs, diagrams & internal handbook | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☑ | **Q-02** Roadmap tracker with automatic QA-gated ticking | ✅ Done | 2026-10-12 · `30fa22b7ef` |
| ☐ | **Q-03** End-to-end tests (Playwright) | ⏳ Pending |  |
| ☐ | **Q-04** Production deployment | ⏳ Pending |  |
| ☐ | **Q-05** Seller validation | ⏳ Pending |  |

## Step details

### ✅ F-01 · Project tooling & quality gates

Next.js 15 App Router, React 19, TypeScript 6 strict (noUncheckedIndexedAccess), Tailwind 3, ESLint flat config for eslint-config-next 16, Vitest 5. The four quality commands every change must pass.

**Status:** Done

**Acceptance criteria**

- [x] npm run typecheck passes with 0 errors
- [x] npm run lint passes with 0 warnings
- [x] npm test passes
- [x] npm run build succeeds

**Tests:** `src/lib/dates.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dates.test.ts 6 tests

### ✅ F-02 · Design system & UI primitives

Brand tokens (forest/emerald, ink, line, gain/loss/warning), Inter font, and ~20 reusable primitives: Button, Card, Table, SortHeader, Pagination, TabLinks, SearchForm, StatusBadge, Delta, StatTile, InfoTooltip, Notice, EmptyState, Skeleton, Sheet.

**Status:** Done · **Depends on:** F-01

**Acceptance criteria**

- [x] Status is always icon + text, never colour alone
- [x] Focus rings visible on every interactive element
- [x] Chart palette validated for colour-vision deficiency

**Tests:** `src/services/views.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ F-03 · App shell, navigation & global filters

Grouped sidebar (Analyse / Operate / Workspace), mobile sheet navigation, sticky top bar with Demo workspace badge, URL-driven date range (Today/7D/30D/90D/custom with validation) and marketplace filter that carry across sections.

**Status:** Done · **Depends on:** F-02

**Acceptance criteria**

- [x] All 10 sections reachable and functional
- [x] Filters live in the URL and survive navigation
- [x] Invalid URL params fall back to safe defaults

**Tests:** `src/lib/dates.test.ts`, `src/services/views.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dates.test.ts 6 tests, views.test.ts 13 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ F-04 · Money & finance domain module

Integer-paise Money class on decimal.js, Indian digit grouping, compact INR, profit chain (net sales → gross → contribution → net), margin, % and pp change, ROAS/ACOS, return rate, stock math, largest-remainder allocation.

**Status:** Done · **Depends on:** F-01

**Acceptance criteria**

- [x] No JavaScript number used for authoritative money math
- [x] Missing COGS makes profit unknown, never zero
- [x] Zero/negative denominators return null

**Tests:** `src/domain/money.test.ts`, `src/domain/finance.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; money.test.ts 8 tests, finance.test.ts 18 tests

### ✅ F-05 · IST calendar & safe URL parsing

All business days are IST day keys; ranges are whole inclusive days; previous-period ranges; allow-list parsing of every query param.

**Status:** Done · **Depends on:** F-01

**Acceptance criteria**

- [x] 7D always means 7 whole IST days regardless of server timezone
- [x] Custom ranges validated (start ≤ end, end ≤ today, ≤ 366 days)

**Tests:** `src/lib/dates.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dates.test.ts 6 tests

### ✅ F-06 · Deterministic demo dataset

Seeded Acme Commerce India workspace: 25 products, ~190 orders over 95 days, returns, settlements with discrepancies, ad campaigns, expenses. Records only, never KPIs.

**Status:** Done · **Depends on:** F-04, F-05

**Acceptance criteria**

- [x] Same seed produces an identical dataset
- [x] Shape matches the spec (25 products, 100–200 orders, all 4 channels)

**Tests:** `src/services/dashboard.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dashboard.test.ts 12 tests

### ✅ F-07 · Ledger: one calculation path

services/ledger.ts converts records into line/return/ad/expense facts once; every page and report aggregates them with the same formulas so totals reconcile.

**Status:** Done · **Depends on:** F-06

**Acceptance criteria**

- [x] Marketplace rows + shared overhead = workspace total
- [x] Σ product profit − unallocated expenses = workspace net profit
- [x] P&L export equals the dashboard

**Tests:** `src/services/dashboard.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dashboard.test.ts 12 tests

### ✅ C-01 · Overview KPIs with honest comparisons

Six KPI cards (net sales, gross profit, net profit, margin, inventory value, settlement pending) with definitions, deltas vs the previous equal period and sparklines. No fabricated comparison when the prior period predates history.

**Status:** Done · **Depends on:** F-07, F-03

**Acceptance criteria**

- [x] Net sales equals an independent recomputation from raw orders
- [x] 90-day view shows 'No prior-period history'
- [x] Margin change shown in percentage points

**Tests:** `src/services/dashboard.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dashboard.test.ts 12 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-02 · Revenue vs profit chart & profit waterfall

Daily/weekly revenue vs gross vs net profit chart with legend, tooltips and table view; horizontal waterfall from net sales to net profit with a screen-reader table.

**Status:** Done · **Depends on:** C-01

**Acceptance criteria**

- [x] One y-axis only
- [x] Unknown values shown as gaps, not zeros
- [x] Table view available for every chart

**Tests:** `src/services/dashboard.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dashboard.test.ts 12 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-03 · Marketplace comparison table

Orders, net sales, net profit, margin, unit return rate and pending settlement per channel, with a shared-overhead row so rows add up to the total.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Rows + overhead reconcile exactly to 'All marketplaces'

**Tests:** `src/services/dashboard.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; dashboard.test.ts 12 tests

### ✅ C-04 · Insight rules engine

Seven deterministic rules (stock-out risk, below reorder point, loses money after ads with ₹500 materiality, high revenue low margin, high return rate, settlement discrepancy, ad spend outpacing sales) with evidence, action and links.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Rules stay silent when data does not support them
- [x] No duplicate insight ids
- [x] Every insight links to a real page

**Tests:** `src/domain/insights.test.ts`, `src/services/dashboard.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; insights.test.ts 10 tests, dashboard.test.ts 12 tests

### ✅ C-05 · Orders list & order detail (demo)

Status tabs with counts, search by order/customer/SKU, sortable columns, pagination, settlement status per order; detail page with line items, allocated shipping, profit chain, settlements and returns.

**Status:** Done · **Depends on:** F-07, F-03

**Acceptance criteria**

- [x] Filters, sort and pagination are correct
- [x] Order detail profit chain adds up

**Tests:** `src/services/views.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-06 · Products & inventory view

Stock on hand, reserved, available, inventory value, estimated unit contribution on the least profitable channel, days of cover from real 30-day velocity, low-stock view.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Days of cover only shown with ≥ 3 orders of history
- [x] Low-stock classification matches reorder points

**Tests:** `src/services/views.test.ts`, `src/domain/finance.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests, finance.test.ts 18 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-07 · Profit Analytics per product

Every cost column per SKU, six sort presets including 'largest losses', search, and the reconciliation footer to workspace net profit.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Sort presets order correctly
- [x] Losses view only shows loss-making products

**Tests:** `src/services/views.test.ts`, `src/services/dashboard.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests, dashboard.test.ts 12 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-08 · Settlements view (read-only)

Expected vs received, matched, awaiting payout, outstanding difference (actual − expected) and review status, with status tabs, search and sorting.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Status counts add up
- [x] Awaiting payouts never show a received amount

**Tests:** `src/services/views.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-09 · Returns analytics view

Unit-level return rate, refund value, estimated loss, recovered stock, reasons, most-returned products and rate by marketplace.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Return rate = returned units ÷ sold units
- [x] Reasons sum to returned units

**Tests:** `src/services/views.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-10 · Advertising view

Campaign spend, attributed sales, ROAS, ACOS, clicks, impressions, with an attribution caveat and flags where spend exceeds attributed sales.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Campaign totals reconcile
- [x] ROAS × ACOS = 100 where both defined

**Tests:** `src/services/views.test.ts`, `src/domain/finance.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; views.test.ts 13 tests, finance.test.ts 18 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ C-11 · Reports & safe CSV exports

Nine CSV reports (P&L, products, marketplaces, inventory, low stock, settlements, returns, advertising, orders) respecting filters, with spreadsheet formula-injection escaping.

**Status:** Done · **Depends on:** F-07

**Acceptance criteria**

- [x] Every report builds
- [x] Cells beginning = + - @ are neutralised
- [x] P&L export matches the dashboard

**Tests:** `src/lib/csv/csv.test.ts`, `src/services/dashboard.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; csv.test.ts 3 tests, dashboard.test.ts 12 tests

### ✅ C-12 · Report viewer: on-screen tables, charts & totals

Every report can be viewed in the app, not only downloaded: summary figures, a chart suited to the report, a sortable and paginated table with a totals row, the metric definitions, CSV download and print. Same data and numbers as the CSV export, filtered by date range and marketplace.

**Status:** Done · **Depends on:** C-11

**Acceptance criteria**

- [x] Every report has a View page reachable from /reports
- [x] Table rows and values match the CSV export exactly
- [x] Totals row equals the sum of its column (decimal-exact) and is only shown where summing is meaningful
- [x] Sorting by any column and pagination work
- [x] Each report shows summary figures and an appropriate chart
- [x] Empty periods show a clear empty state
- [x] Print shows only the report content

**Tests:** `src/services/report-views.test.ts`

**Manual QA:** Checked report pages at 1440 px and a true 400 px viewport; Charts, sorting, pagination, CSV and print checked

**Evidence:** verified 2026-10-12T18:42:04Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓; report-views.test.ts 9 tests

**QA notes:** All 9 report pages checked at 1440 px and 400 px: charts, tiles, sorting, pagination, totals, CSV, print and empty state work

### ✅ I-01 · Database: Prisma 7 + Neon schema & migrations

Workspace, MarketplaceConnection, OAuthState, ExternalOrder, ExternalOrderItem and SyncRun tables with workspace-scoped unique keys; batched upserts with explicit UTC timestamps.

**Status:** Done · **Depends on:** F-01

**Acceptance criteria**

- [x] Migration applied to the Neon dev database
- [x] Bulk upsert of 100 orders is idempotent and fast
- [x] Timestamps round-trip exactly in IST and UTC

**Tests:** `src/repositories/prisma-integration-repository.db.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; prisma-integration-repository.db.test.ts 4 tests

### ✅ I-02 · Token encryption & OAuth hardening

AES-256-GCM token encryption; OAuth state that is random, hashed, single-use, 10-minute and browser-bound; POST-only, origin-checked state-changing routes.

**Status:** Done · **Depends on:** I-01

**Acceptance criteria**

- [x] Tokens never stored in plaintext
- [x] Replayed, expired or cross-browser callbacks are rejected

**Tests:** `src/lib/crypto/token-cipher.test.ts`, `src/services/integrations/integrations.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; token-cipher.test.ts 5 tests, integrations.test.ts 19 tests

### ✅ I-03 · Amazon SP-API adapter (Orders 2026-01-01)

Seller Central India consent flow, LWA code exchange and refresh, searchOrders on the EU endpoint without buyer PII, status and money mapping, resumable cursor. Built against Amazon's published model; not yet run live (see I-08).

**Status:** Done · **Depends on:** I-02

**Acceptance criteria**

- [x] No BUYER/RECIPIENT datasets requested
- [x] Pagination and resume cursor work
- [x] Malformed responses are rejected

**Tests:** `src/integrations/__tests__/amazon.test.ts`, `src/integrations/__tests__/http.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; amazon.test.ts 10 tests, http.test.ts 4 tests

### ✅ I-04 · Flipkart Seller API adapter (Shipments v3)

Authorization-code flow with Basic client auth, six-segment rolling 30-day window, item grouping and order-status derivation, nextPageUrl host guard. Five assumptions marked VERIFY IN SANDBOX (see I-09).

**Status:** Done · **Depends on:** I-02

**Acceptance criteria**

- [x] All six filter segments walked
- [x] Foreign-host pagination URLs refused
- [x] Cancelled items excluded from value

**Tests:** `src/integrations/__tests__/flipkart.test.ts`, `src/integrations/__tests__/http.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; flipkart.test.ts 7 tests, http.test.ts 4 tests

### ✅ I-05 · Sync engine

Provider-agnostic, idempotent, resumable sync with 8-page / 8-second budgets, run locking, token refresh, reauth detection and batched page saves.

**Status:** Done · **Depends on:** I-03, I-04

**Acceptance criteria**

- [x] Re-sync never duplicates
- [x] Progress kept on rate limits and failures
- [x] Items merged across pages

**Tests:** `src/services/integrations/integrations.test.ts`

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; integrations.test.ts 19 tests

### ✅ I-06 · Integrations page & synced Orders tab

Honest connection states (not configured with missing variable names, not connected, connected, reconnect required), connect/sync/disconnect, Demo/Synced source switch on Orders.

**Status:** Done · **Depends on:** I-05

**Acceptance criteria**

- [x] Never shows 'Connected' without stored tokens
- [x] Demo and synced orders are never mixed

**Tests:** `src/services/integrations/integrations.test.ts`

**Manual QA:** Checked at 1440 px and a true 400 px viewport (no horizontal page scroll); Loading, empty and error states reviewed

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; integrations.test.ts 19 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### 🔨 I-07 · Revoked access → 'Reconnect required'

When a seller revokes access, token services reply 400 invalid_grant to the refresh call; today that shows 'sync failed'. Treat invalid_grant from the refresh call as unauthorized so the card asks to reconnect.

**Status:** In progress · **Depends on:** I-05

**Acceptance criteria**

- [ ] Refresh returning 400 invalid_grant marks the connection REAUTH_REQUIRED
- [ ] Other 400 errors still report a generic failure

**Tests:** `src/services/integrations/integrations.test.ts`

### ⛔ I-08 · First live Amazon connection (Draft app)

Register the SP-API app, connect a real seller account with version=beta, sync and spot-check orders against Seller Central (checklist in docs/07 §7.9).

**Status:** Blocked · **Depends on:** I-06, A-01

**Acceptance criteria**

- [ ] Consent → callback → 'Connected' with seller id
- [ ] Five orders match Seller Central exactly
- [ ] Revoked app shows 'Reconnect required'

**Manual QA:** Spot-check 5 orders against Seller Central

### ⛔ I-09 · Flipkart sandbox verification

Run the adapter against the Flipkart sandbox and confirm the five VERIFY IN SANDBOX assumptions (token method, refresh grant, nextPageUrl format, sellingPrice semantics, orderDate filter on all segments).

**Status:** Blocked · **Depends on:** I-06

**Acceptance criteria**

- [ ] All five assumptions confirmed or code adjusted with tests

**Manual QA:** Compare sandbox orders with Seller Hub

### ⏳ I-10 · Scheduled background sync

Netlify Scheduled Function that runs the existing lock-protected, resumable sync for every connected account (e.g. every 15 minutes).

**Status:** Pending · **Depends on:** I-05, A-02

**Acceptance criteria**

- [ ] Runs unattended and resumes partial syncs
- [ ] Overlapping runs are prevented
- [ ] Failures recorded in SyncRun with safe messages

### ⏳ I-11 · Synced order detail page

Detail view for synced orders: items, SKU/ASIN/FSN, raw marketplace status history, last sync, link to the marketplace order.

**Status:** Pending · **Depends on:** I-06

**Acceptance criteria**

- [ ] No buyer PII displayed
- [ ] Unknown values shown as unknown

### 🔭 I-12 · Publish Amazon app to the Appstore

Pass Amazon's app review and data-protection requirements so any seller can connect; remove version=beta.

**Status:** Future · **Depends on:** I-08, A-03, A-04

**Acceptance criteria**

- [ ] App published; AMAZON_SPAPI_DRAFT_APP=false in production

### 🔭 I-13 · Shopify adapter

Third marketplace via the Shopify Admin API behind the existing adapter port (docs/07 §7.10).

**Status:** Future · **Depends on:** I-05

**Acceptance criteria**

- [ ] Orders sync idempotently
- [ ] No changes needed to the sync engine

### ⭐ A-01 · Authentication (sign-in)

Auth.js sign-in (Google and/or email), session middleware for all product routes, sign-out. Unblocks safe deployment with real data.

**Status:** Next pick

**Acceptance criteria**

- [ ] Every product route requires a session
- [ ] Session cookies are httpOnly and secure
- [ ] Unauthenticated API calls return 401

### ⏳ A-02 · Workspaces, membership & roles

User, WorkspaceMember and roles (Owner, Admin, Analyst, Viewer); getCurrentWorkspace() resolves the signed-in member's workspace; role checks on mutations.

**Status:** Pending · **Depends on:** A-01

**Acceptance criteria**

- [ ] User A cannot read or write user B's workspace (tested)
- [ ] Workspace id never taken from the request

### ⏳ A-03 · Audit log

AuditLog for connects, disconnects, settlement adjustments and stock edits: actor, time, before/after, reason.

**Status:** Pending · **Depends on:** A-02

**Acceptance criteria**

- [ ] Every financial or stock mutation writes an audit entry

### ⏳ A-04 · Rate limiting & security headers

Per-user/IP limits on connect, sync and import routes; Content-Security-Policy and related headers; partial unique index for the sync lock.

**Status:** Pending · **Depends on:** A-01

**Acceptance criteria**

- [ ] Abusive request bursts are throttled
- [ ] CSP blocks inline script injection

### ⏳ D-01 · Products & unit costs in the database

Persist products, listings per channel and unit costs; map synced SKUs/ASINs/FSNs to products so COGS is known.

**Status:** Pending · **Depends on:** A-02, I-05

**Acceptance criteria**

- [ ] Unmapped SKUs are flagged, never costed at zero
- [ ] Cost changes are audited

### ⏳ D-02 · Order costs from marketplaces

Record commission, closing fees, shipping and gateway fees per order (OrderCost) from marketplace data, marked recorded vs estimated.

**Status:** Pending · **Depends on:** D-01

**Acceptance criteria**

- [ ] No fee is counted twice
- [ ] Estimated costs are labelled

### ⏳ D-03 · Dashboard on real data

Ledger reads facts from the database (SQL aggregation + cache) instead of the demo seed; demo stays as its own workspace.

**Status:** Pending · **Depends on:** D-01, D-02

**Acceptance criteria**

- [ ] All reconciliation tests pass on database-backed data
- [ ] Demo and real workspaces never mix

### ⏳ D-04 · Settlement data import

Import settlement batches and transactions from Amazon Finances / settlement reports and Flipkart payments, idempotently.

**Status:** Pending · **Depends on:** I-05, A-02

**Acceptance criteria**

- [ ] Re-import never duplicates transactions
- [ ] Settlements never counted as sales

### ⏳ D-05 · Settlement matching engine

Four-step matching priority (exact txn ref → order ref + type → amount + date tolerance → manual review); one-to-many and many-to-one; method and confidence recorded.

**Status:** Pending · **Depends on:** D-04

**Acceptance criteria**

- [ ] Ambiguous matches are never auto-reconciled
- [ ] Difference = actual − expected everywhere

### ⏳ D-06 · Manual review workflow

Review queue for differences with required explanation, SettlementAdjustment and audit entry.

**Status:** Pending · **Depends on:** D-05, A-03

**Acceptance criteria**

- [ ] Explanation required for every manual adjustment
- [ ] Every adjustment is audited

### ⏳ D-07 · Expenses entry

Record operating expenses with optional marketplace; shared overhead stays unallocated.

**Status:** Pending · **Depends on:** A-02

**Acceptance criteria**

- [ ] Overhead never allocated to channels or products

### 🔭 D-08 · Returns sync

Flipkart returns API and Amazon returns data feeding ReturnRecord with recovery status.

**Status:** Future · **Depends on:** D-01

**Acceptance criteria**

- [ ] Return losses follow the documented policy

### 🔭 D-09 · Advertising data import

Advertising CSV import and later the Amazon Ads API, feeding AdvertisingDailyMetric.

**Status:** Future · **Depends on:** O-01

**Acceptance criteria**

- [ ] Attribution caveat shown with every ROAS/ACOS

### ⏳ O-01 · CSV import pipeline

Upload → preview → column mapping → validation → duplicate detection → confirm → summary, for orders, settlements and ads; size/row limits; CsvImportJob history.

**Status:** Pending · **Depends on:** A-02

**Acceptance criteria**

- [ ] Invalid and duplicate rows reported per row
- [ ] Import is transactional and idempotent

### ⏳ O-02 · Product & stock management

Add/edit products, stock adjustments with movement history, reorder thresholds, no negative stock unless backorders are enabled.

**Status:** Pending · **Depends on:** D-01, A-03

**Acceptance criteria**

- [ ] Every stock change creates a movement
- [ ] Negative stock blocked by default

### ⏳ O-03 · Insight lifecycle & fee rule

Persist insights with read/resolved state and creation time; add the spec's 'unusually high marketplace fees' rule.

**Status:** Pending · **Depends on:** D-03

**Acceptance criteria**

- [ ] Insights never duplicate
- [ ] Resolved insights reopen only if the condition returns

### 🔭 O-04 · Editable settings

Edit insight thresholds, rate card and workspace preferences with validation and audit.

**Status:** Future · **Depends on:** A-03

**Acceptance criteria**

- [ ] Every change validated and audited

### ✅ Q-01 · Engineering docs, diagrams & internal handbook

docs/ guide (13 pages), docs/architecture (10 pages incl. full product architecture), 70+ rendered diagrams, updated Cursor rules, and the /internal handbook gated in production.

**Status:** Done · **Depends on:** F-01

**Acceptance criteria**

- [x] Every doc link resolves
- [x] /internal hidden in production without a password

**Tests:** `src/internal/internal.test.ts`

**Manual QA:** Handbook reviewed at desktop and 400 px; code blocks readable

**Evidence:** verified 2026-10-12T18:24:31Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓, db tests ✓; internal.test.ts 9 tests

**QA notes:** Every app route measured at 1440 px and a true 400 px viewport via DevTools device emulation (scrollWidth = viewport, no horizontal scroll); empty, loading, error and not-found states exercised on a production build; /internal handbook reviewed at desktop and 400 px with code blocks verified readable by computed style.

### ✅ Q-02 · Roadmap tracker with automatic QA-gated ticking

This roadmap: one JSON source of truth, a QA gate that ticks a step only after typecheck, lint, the full test suite, build and manual QA notes pass, a Cursor rule that makes it automatic, and a /internal page.

**Status:** Done · **Depends on:** Q-01

**Acceptance criteria**

- [x] Steps can only become done through the gate
- [x] The test suite fails if the roadmap is invalid
- [x] Progress visible at /internal/roadmap

**Tests:** `src/internal/roadmap.test.ts`

**Manual QA:** Roadmap page reviewed at desktop and 400 px

**Evidence:** verified 2026-10-12T18:30:27Z at `30fa22b7ef` (uncommitted changes): typecheck ✓, lint ✓, tests ✓, build ✓; roadmap.test.ts 8 tests

**QA notes:** Roadmap page tested interactively at 1440 px and a true 400 px viewport (no horizontal scroll): status filters show correct counts (All 53, Done 25, Blocked 2, Next pick 1, Future 5), search finds I-04/I-09 for 'sandbox', empty state shows on no match, steps expand to show acceptance criteria, tests and QA-gate evidence, dependency links navigate, blocked reasons display.

### ⏳ Q-03 · End-to-end tests (Playwright)

Playwright flows: sign in, filter the dashboard, connect (mocked) and sync, export a report, review a discrepancy.

**Status:** Pending · **Depends on:** A-01

**Acceptance criteria**

- [ ] E2E suite runs in CI on every pull request

### ⏳ Q-04 · Production deployment

Production Neon with backups (PITR), Netlify env per environment, same-region database and functions, monitoring and alerting without PII.

**Status:** Pending · **Depends on:** A-01, A-02, A-04

**Acceptance criteria**

- [ ] Separate dev/staging/production secrets
- [ ] Restore from backup rehearsed

**Manual QA:** Deployment checklist completed

### ⏳ Q-05 · Seller validation

Interview sellers and validate the value proposition (see docs/13-seller-value-and-product-plan.md) before building more.

**Status:** Pending

**Acceptance criteria**

- [ ] Findings recorded and roadmap re-prioritised
