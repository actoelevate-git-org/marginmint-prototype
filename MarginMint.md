# Build MarginMint — An AI-Powered Seller Operations & Profit Intelligence Platform

Act as a senior full-stack engineer, SaaS product designer, product manager, and data architect.

Build a polished, production-minded SaaS web application named **MarginMint** that helps e-commerce sellers understand their actual profits, manage inventory, reconcile marketplace settlements, track returns, and make better business decisions.

Do not create just a landing page or a static dashboard. Build a functional application with realistic data, working interactions, proper calculations, reusable components, and a scalable architecture.

First inspect the existing repository, understand the current stack, and preserve any working code. If the repository is empty, initialize the project using the recommended stack below.

---

# 1. Product Vision

**Product name:** MarginMint

**Tagline:** Every Sale. Every Cost. Your Real Profit.

**One-line description:** MarginMint brings orders, inventory, marketplace settlements, returns, and product-level profitability into one unified workspace.

## The problem we solve

Indian e-commerce sellers often operate across Amazon, Flipkart, Shopify, and their own D2C websites.

Their operational information is scattered across different dashboards and spreadsheets.

They struggle to answer important questions:

- How much profit did I actually make today?
- Which products generate the highest profit?
- Which products sell frequently but barely make money?
- How much money should the marketplace pay me?
- Which orders or fees explain the difference between expected and actual settlements?
- Which products are running out of stock?
- How much money am I losing through returns?
- How much do advertising, shipping, commissions, and discounts reduce my margins?
- Which products should I restock, reprice, or stop selling?

MarginMint must help sellers answer these questions quickly using one reliable source of operational and financial information.

## Target users

1. Amazon India sellers.
2. Flipkart sellers.
3. Shopify store owners.
4. Direct-to-consumer brands.
5. Small and medium-sized e-commerce businesses.
6. Sellers operating on multiple marketplaces simultaneously.

## Core value proposition

Turn fragmented commerce data into actionable business decisions.

The main product principle is:

**Revenue is not profit. Make every cost visible.**

---

# 2. Technology Stack

Use the following stack unless the existing project has a strong reason to retain a different choice.

Frontend:
- Next.js with App Router.
- TypeScript with strict mode.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- Recharts for charts.
- React Hook Form and Zod for forms and validation.

Backend:
- Next.js server-side route handlers or server actions where appropriate.
- TypeScript.
- A clean service and repository architecture.
- Zod for request validation.
- Centralized error handling.

Database:
- PostgreSQL.
- Prisma ORM.
- Seed scripts for realistic demo data.
- Database migrations.

Authentication:
- Auth.js or another established authentication solution compatible with the selected Next.js version.
- Protected application routes.
- User-specific workspaces and data isolation.

Testing:
- Vitest for unit tests.
- Playwright for important end-to-end workflows.

Development experience:
- ESLint.
- Prettier.
- Environment variables in `.env.example`.
- Clear setup instructions in `README.md`.

Use stable, mutually compatible package versions. Do not install unnecessary dependencies.

If external credentials are unavailable, the application must still run using seeded demo data.

---

# 3. Design Direction and Brand Identity

Create a premium, modern B2B SaaS experience.

The design should feel like a combination of Stripe, Linear, and a sophisticated financial analytics product.

Avoid generic admin templates, excessive gradients, oversized cards, excessive rounded corners, and unnecessary decoration.

## Brand

Name: MarginMint

Suggested logo concept:
A minimal geometric symbol combining a rising profit line with a leaf or upward movement, accompanied by the wordmark MarginMint.

Use Lucide icons or simple CSS/SVG elements for the logo. Do not depend on external image assets.

## Color system

- Deep forest green: `#14532D`
- Primary emerald: `#16A34A`
- Soft mint: `#DCFCE7`
- Dark text: `#111827`
- Secondary text: `#6B7280`
- Main background: `#F8FAFC`
- Card background: `#FFFFFF`
- Borders: `#E5E7EB`
- Warning: `#F59E0B`
- Loss/error: `#DC2626`

Use green for positive profitability, red for losses, and amber for attention-required states. Do not use color alone to communicate financial status.

## Layout

Desktop-first application with a responsive mobile experience.

Use:
- A compact left navigation sidebar.
- A clean top navigation bar.
- Workspace and date-range selectors.
- A consistent content grid.
- Readable tables with sorting and filtering.
- Clear empty, loading, and error states.
- Tooltips for unfamiliar financial metrics.
- Consistent spacing and typography.

The interface should look like a real product used daily by business owners.

---

# 4. Application Navigation

Create these main sections:

1. Overview
2. Orders
3. Products & Inventory
4. Profit Analytics
5. Settlements
6. Returns
7. Advertising
8. Reports
9. Integrations
10. Settings

Use a persistent sidebar on desktop and an appropriate collapsible navigation on smaller screens.

Each navigation item must open a functional page. Do not leave navigation links pointing to empty placeholder screens.

---

# 5. Overview Dashboard

This is the most important screen.

The first screen should immediately tell sellers how their business is performing.

## Header

Display:

- Greeting and workspace name.
- Date range selector: Today, 7 days, 30 days, 90 days, Custom.
- Marketplace filter: All, Amazon, Flipkart, Shopify, D2C.
- Export report action.
- Last data synchronization time.

Filters must update the dashboard calculations and visualizations.

## KPI cards

Create six metrics:

### A. Net Sales
Revenue after discounts and cancellations, following clearly documented accounting rules.

### B. Gross Profit
Net sales minus the cost of goods sold.

### C. Net Profit
Net sales minus applicable product costs, marketplace fees, shipping, advertising, refunds, and other recorded expenses.

### D. Net Profit Margin
Net profit divided by net sales, multiplied by 100.

Handle zero or negative net sales safely.

### E. Inventory Value
Current sellable inventory multiplied by the relevant unit cost.

### F. Settlement Pending
Expected marketplace payouts that have not yet been received or reconciled.

Each card should show:
- Current value.
- Comparison with the previous equivalent period.
- Percentage change where mathematically valid.
- An appropriate trend indicator.
- A small sparkline where useful.
- A tooltip explaining the metric.

Never display fabricated percentage changes when comparison data is unavailable.

## Main chart: Revenue vs. Profit

Create an interactive time-series chart containing:
- Net sales.
- Gross profit.
- Net profit.

Allow daily and weekly grouping.

Include tooltips with formatted INR values.

Do not make the chart misleading by mixing incompatible units.

## Profit breakdown

Create a clear visual breakdown showing:

- Net sales.
- Cost of goods sold.
- Marketplace commissions and fees.
- Shipping and fulfillment.
- Advertising expenses.
- Refund and return losses.
- Other recorded expenses.
- Net profit.

Use a waterfall chart if practical, or a stacked/bar visualization with clearly explained semantics.

## Marketplace performance

Create a marketplace comparison table with:

- Marketplace.
- Orders.
- Net sales.
- Net profit.
- Profit margin.
- Return rate.
- Pending settlement amount.

Include Amazon, Flipkart, Shopify, and D2C as sample marketplace channels.

## Actionable insights

Display a section named "Needs Your Attention".

Generate deterministic, data-backed insights such as:

- "Product X may run out of stock in 5 days."
- "Product Y has a negative profit margin after advertising."
- "₹12,450 in settlement differences requires review."
- "Product Z has an unusually high return rate."
- "Advertising expenses increased while sales remained flat."

Every insight must be derived from actual application data and calculations.

Each insight must include:
- Severity.
- Explanation.
- Relevant amount or metric.
- A recommended next action.
- A link to the relevant product, settlement, or report.

Do not use an LLM or external AI API as a requirement for the initial version. Implement a deterministic rules engine first.

---

# 6. Orders Management

Create a comprehensive order management page.

## Order table

Include:

- Order ID.
- Order date.
- Marketplace.
- Customer reference.
- Product count.
- Order value.
- Discounts.
- Order status.
- Fulfillment status.
- Payment or settlement status.

Use realistic Indian marketplace-style sample data without using actual customer personal information.

## Functionality

Implement:
- Search by order ID.
- Filter by marketplace.
- Filter by order status.
- Filter by date range.
- Sort columns.
- Pagination.
- Order detail drawer or page.
- Export to CSV.

Order detail must show:
- Line items.
- Quantities.
- Selling price.
- Discounts.
- Estimated product cost.
- Recorded fees.
- Shipping expense.
- Refund information.
- Profit calculation.
- Related settlement transactions.

Support order statuses such as:
- Pending.
- Confirmed.
- Shipped.
- Delivered.
- Cancelled.
- Returned.

Use status badges with accessible text.

Order changes must be persisted to the database.

---

# 7. Products & Inventory

Create a product catalog and inventory management experience.

## Product table

Columns:
- Product name.
- SKU.
- Marketplace.
- Selling price.
- Unit cost.
- Stock on hand.
- Reserved stock.
- Available stock.
- Estimated inventory value.
- Estimated profit per unit.
- Profit margin.
- Inventory status.

## Inventory calculations

Available stock = stock on hand - reserved stock.

Inventory value = sellable stock × unit cost.

Estimated unit contribution = selling price - applicable variable costs per unit.

Clearly distinguish estimated unit contribution from actual realized net profit.

## Low-stock alerts

Allow users to configure a reorder threshold for each SKU.

When available stock reaches or falls below that threshold, flag the SKU as low stock.

Calculate estimated days of stock remaining using recent average daily sales when enough historical data exists.

If there is insufficient sales history, show "Insufficient sales history" instead of inventing a forecast.

## Inventory functionality

Implement:
- Add product.
- Edit product.
- Update stock.
- Set reorder threshold.
- Search and filter.
- Stock movement history.
- Low-stock view.
- CSV import with validation.
- CSV export.
- Product detail view.

Record stock movements for manual adjustments and supported order/return events.

Prevent negative inventory unless the user explicitly enables backorders or the business rules permit it.

---

# 8. Profit Analytics

This is MarginMint's primary differentiator.

Create a detailed profit analytics workspace.

## Product-level profitability

For every product, calculate and display:

- Gross sales.
- Discounts.
- Net sales.
- Cost of goods sold.
- Marketplace commission.
- Fulfillment fees.
- Shipping expenses.
- Advertising allocation.
- Refund and return losses.
- Other attributable expenses.
- Net profit.
- Net profit margin.
- Profit per unit.

Make each cost component inspectable.

Allow sorting by:
- Highest profit.
- Lowest profit.
- Highest margin.
- Lowest margin.
- Highest revenue.
- Largest losses.

## Profit formulas

Define financial calculations in a dedicated, tested domain module.

Use these initial formulas:

Net sales = gross item sales - discounts - cancelled item value.

Gross profit = net sales - cost of goods sold.

Contribution profit = net sales - cost of goods sold - variable marketplace fees - fulfillment costs - shipping costs - other attributable variable costs.

Operating net profit = contribution profit - allocated advertising expenses - other recorded operating expenses.

Net profit margin = operating net profit / net sales × 100, when net sales are non-zero.

These are management-accounting estimates, not necessarily audited accounting profit.

Refunds, taxes, shipping, marketplace fees, advertising, and settlement transactions must follow clearly defined accounting rules. Do not subtract the same expense twice.

For returns, distinguish:
- Refund amount.
- Recoverable inventory cost.
- Non-recoverable product cost.
- Return shipping.
- Restocking fees.
- Other return-related expenses.

For taxes, do not treat GST collected on behalf of the government as earned revenue. Keep tax components separate and configure the treatment of input tax credits and other tax-related amounts explicitly.

Do not silently treat settlement payouts as sales. Settlements represent money movement, while orders and accounting events establish sales and related costs.

Show the data coverage and estimation status of each profitability calculation.

---

# 9. Marketplace Settlement Reconciliation

This is one of the most important features.

Create a dedicated Settlements page that helps sellers understand the difference between what marketplaces should pay and what they actually paid.

## Settlement overview

Show:
- Total expected payouts.
- Total received payouts.
- Matched amount.
- Unmatched amount.
- Outstanding differences.
- Transactions requiring review.

## Settlement transaction table

Include:
- Transaction ID.
- Marketplace.
- Order ID or reference.
- Transaction date.
- Transaction type.
- Expected amount.
- Actual amount.
- Difference.
- Reconciliation status.
- Explanation or notes.

Support transaction types such as:
- Order proceeds.
- Marketplace commission.
- Shipping or fulfillment fees.
- Advertising charges.
- Refunds.
- Adjustments.
- Taxes and withholding.
- Settlement payout.

## Import settlement statements

Build a working CSV import flow.

Steps:
1. Upload a CSV.
2. Preview its rows.
3. Map incoming columns to MarginMint fields.
4. Validate the data.
5. Identify invalid rows and duplicates.
6. Confirm the import.
7. Display an import summary.

Allow importing an order export and a settlement export independently.

Provide downloadable example CSV templates.

## Matching engine

Implement a deterministic reconciliation engine.

Use available references, marketplace, currency, transaction type, amounts, and dates to match records.

Matching priority:
1. Exact marketplace transaction reference.
2. Exact order or settlement reference with compatible transaction type.
3. Strong match based on marketplace, amount, and a configurable date tolerance.
4. Manual review for ambiguous matches.

Never silently mark an ambiguous transaction as reconciled.

Use statuses:
- Matched.
- Partially matched.
- Unmatched.
- Needs review.
- Excluded.

Support one-to-many and many-to-one matches where multiple fees or orders are combined into a settlement payout.

Record:
- Match method.
- Match confidence.
- Matched amount.
- Unmatched amount.
- User adjustments.
- Audit history.

## Reconciliation difference

Difference = actual received amount - expected amount, following the configured sign convention.

Clearly explain whether a positive difference means an overpayment or an unexplained additional credit.

Let the user open a transaction to inspect the individual components that explain the difference.

Add an action to mark a transaction as reviewed, with a required explanation for manual adjustments.

---

# 10. Returns & Refunds

Create a returns management page.

Track:
- Return ID.
- Order ID.
- Marketplace.
- SKU.
- Quantity.
- Return date.
- Reason.
- Refund amount.
- Product recovery status.
- Return shipping cost.
- Financial impact.
- Return status.

Support reasons such as:
- Damaged product.
- Wrong item.
- Customer changed mind.
- Product quality.
- Delivery issue.
- Other.

## Return analytics

Show:
- Return rate.
- Refund value.
- Estimated loss from returns.
- Most frequently returned products.
- Common return reasons.
- Return rate by marketplace.

Calculate return rate using a clearly documented definition, such as returned units divided by sold units for the selected period.

Do not mix order-level and unit-level rates.

Identify products whose return rates exceed configurable thresholds.

Provide drill-downs from return insights to the relevant products and orders.

---

# 11. Advertising Analytics

Create an advertising analytics page for manually imported advertising data.

Track:
- Marketplace.
- Campaign.
- Date.
- Advertising spend.
- Attributed sales.
- Attributed orders.
- Clicks.
- Impressions.
- Product or SKU when available.

Calculate:

ROAS = attributed sales / advertising spend.

ACOS = advertising spend / attributed sales × 100.

Advertising-adjusted contribution = attributable contribution before advertising - advertising spend.

Handle zero denominators safely.

Clearly explain that attributed sales are not necessarily incremental sales and that advertising attribution windows can differ.

Allow users to import advertising reports through CSV.

Do not claim direct advertising integrations exist unless implemented and tested.

---

# 12. Reports

Build a reporting workspace with:
- Profit and loss summary.
- Product profitability report.
- Marketplace performance report.
- Inventory valuation report.
- Low-stock report.
- Settlement reconciliation report.
- Returns and refund report.
- Advertising performance report.

Each report must support:
- Date and marketplace filters where relevant.
- CSV export.
- Correct totals.
- Empty states.
- A visible explanation of the metrics.

Generate report contents from the same domain calculations used by the dashboard.

Do not create separate, inconsistent calculation logic for each page.

---

# 13. Integrations

Create an Integrations page with cards for:
- Amazon Seller Central.
- Flipkart Seller Hub.
- Shopify.
- CSV imports.

Each card must show:
- Connection status.
- Supported data types.
- Last successful sync.
- Available actions.

Initially implement:
- CSV import.
- CSV export.
- Demo data connection.
- Connection status UI.
- Integration configuration structure.

For external marketplaces, clearly label connections as "Not connected" until a real integration is configured and successfully authenticated.

Do not fabricate successful API connections.

Keep provider-specific API logic isolated behind adapter interfaces so official APIs can be added later.

Respect each marketplace's authorization, API policies, rate limits, and data-access requirements. Never request marketplace passwords or store them in plaintext.

---

# 14. AI-Ready Business Insights

Build a rule-based insight engine with a clean interface that can support an LLM later.

Implement insights such as:

1. Negative-profit product.
2. High-revenue, low-margin product.
3. Inventory likely to run out.
4. Excessive return rate.
5. Settlement discrepancy.
6. Advertising efficiency decline.
7. Unusually high marketplace fees.
8. Potential stockout affecting a high-profit product.

Each insight must contain:
- Unique ID.
- Type.
- Severity.
- Title.
- Evidence.
- Affected entity.
- Estimated financial impact, if calculable.
- Recommended action.
- Creation time.
- Read or resolved status.

Example:

Title: "Your best-selling product is losing money"

Evidence: "SKU MM-104 generated ₹85,000 in net sales, but product costs, fees, and advertising produced an estimated loss of ₹4,200."

Recommended action: "Review selling price, marketplace fees, and advertising spend."

Only generate this insight if the stored data supports those numbers.

Avoid generating duplicate alerts repeatedly.

Use deterministic rules for the MVP. Any future AI-generated recommendations must reference underlying records and clearly distinguish facts from estimates.

---

# 15. Database Design

Create a normalized relational database.

At minimum, implement models for:

- User.
- Workspace.
- WorkspaceMember.
- MarketplaceAccount.
- Product.
- ProductMarketplaceListing.
- InventoryBalance.
- InventoryMovement.
- Order.
- OrderItem.
- OrderCost.
- SettlementBatch.
- SettlementTransaction.
- SettlementMatch.
- SettlementAdjustment.
- ReturnRecord.
- AdvertisingCampaign.
- AdvertisingDailyMetric.
- Expense.
- CsvImportJob.
- Insight.
- AuditLog.

Add appropriate:
- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Decimal fields for money.
- Timestamps.
- Workspace ownership.
- Data validation.

Use integer minor units or PostgreSQL Decimal types for financial amounts. Never use JavaScript floating-point arithmetic as the authoritative method for monetary calculations.

Use explicit currency fields, defaulting to INR for the Indian-market demo.

Keep raw imported data or a safe normalized representation where needed for troubleshooting and auditing.

Make imports idempotent where practical to prevent duplicated orders, fees, and settlement transactions.

Implement workspace-level data isolation and authorization checks on every protected read and write.

---

# 16. Demo Data

The application must feel alive immediately after setup.

Create a realistic seeded demo workspace called "Acme Commerce India".

Include:
- Amazon India.
- Flipkart.
- Shopify.
- D2C.

Create approximately:
- 25 products.
- 100–200 orders.
- 30–50 return records.
- 50–100 settlement transactions.
- Several settlement discrepancies.
- Inventory movements.
- Advertising data.
- Expenses.
- Product-level costs.
- Positive-profit, low-margin, and loss-making products.

Use plausible INR values.

Generate data with consistent relationships and reproducible seeds.

Example products:
- Wireless Earbuds.
- Stainless Steel Bottle.
- Cotton T-Shirt.
- Laptop Stand.
- Yoga Mat.
- Desk Organizer.
- USB-C Hub.
- Insulated Travel Mug.

Create a mixture of:
- Profitable products.
- High-revenue but low-margin products.
- Products losing money after advertising.
- Products with high return rates.
- Products with low stock.
- Products with settlement mismatches.

The dashboard KPIs must be calculated from the seeded records rather than hardcoded independently.

Display a clear "Demo Workspace" indicator so users understand that the data is simulated.

---

# 17. API and Architecture

Keep the application modular.

Suggested structure:

- `app/` for routes and layouts.
- `components/` for reusable UI.
- `features/orders/`
- `features/inventory/`
- `features/profitability/`
- `features/settlements/`
- `features/returns/`
- `features/advertising/`
- `features/reports/`
- `features/integrations/`
- `lib/db/`
- `lib/auth/`
- `lib/validation/`
- `lib/money/`
- `lib/errors/`
- `lib/csv/`
- `services/`
- `repositories/`
- `domain/`
- `prisma/`
- `tests/`

Adapt the structure to the actual repository instead of forcing unnecessary abstraction.

Implement typed service methods for:
- Dashboard summaries.
- Order listing and filtering.
- Inventory updates.
- Product profitability.
- Settlement matching.
- Return analytics.
- Advertising metrics.
- CSV import and export.
- Insight generation.

Validate all inputs on the server.

Enforce authorization before querying or modifying workspace data.

Do not expose database credentials or marketplace secrets to the client.

Use pagination for large datasets.

---

# 18. Functional Requirements

The following must actually work:

- Sidebar navigation.
- Dashboard date and marketplace filters.
- Search, sort, and pagination.
- Product creation and editing.
- Inventory adjustments.
- Low-stock calculations.
- Order detail views.
- Profitability calculations.
- Settlement CSV imports.
- CSV column mapping.
- Duplicate detection.
- Settlement matching.
- Manual reconciliation review.
- Return filtering.
- Advertising CSV imports.
- Report generation.
- CSV downloads.
- Insight resolution.
- Form validation.
- Database persistence.
- Loading, empty, and error states.
- Responsive layouts.

Use real database operations for implemented functionality.

Do not use fake buttons that do nothing.

If an operation requires unavailable third-party credentials, provide an honest disabled or setup-required state instead of pretending it succeeded.

---

# 19. Security and Reliability

Implement:
- Authentication for protected application pages.
- Server-side authorization.
- Workspace-level data isolation.
- Input validation.
- Safe CSV parsing.
- Upload size and row limits.
- CSV formula-injection protection during export.
- Secure handling of secrets.
- Audit records for financial adjustments.
- Idempotent imports where possible.
- Useful server logs without leaking sensitive information.

Do not store customer passwords or unnecessary customer personal data.

Treat imported CSV content as untrusted input.

For production readiness, document backup, retention, monitoring, and deployment considerations.

---

# 20. Testing Requirements

Write unit tests for:

- Net sales.
- Gross profit.
- Contribution profit.
- Operating net profit.
- Profit margin.
- ROAS and ACOS.
- Inventory availability.
- Days of stock remaining.
- Return rate.
- Settlement difference calculations.
- Exact-reference settlement matching.
- Ambiguous settlement matching.
- Duplicate CSV imports.
- Currency precision and rounding.
- Authorization and workspace isolation.

Include edge cases:
- Zero sales.
- Negative profit.
- Missing costs.
- Partial refunds.
- Multiple fees per order.
- One payout covering multiple orders.
- Duplicate transactions.
- Different transaction dates.
- Insufficient inventory history.
- Invalid CSV rows.

Add end-to-end tests for at least:
1. Logging in and opening the demo workspace.
2. Filtering the dashboard.
3. Updating inventory.
4. Importing a settlement CSV.
5. Reviewing a discrepancy.
6. Exporting a profitability report.

---

# 21. Implementation Workflow

Work in phases.

## Phase 1: Foundation
- Inspect the repository.
- Set up the application and design system.
- Configure PostgreSQL and Prisma.
- Create the database schema.
- Add authentication and workspace isolation.
- Seed demo data.

## Phase 2: Core experience
- Build the navigation.
- Build the overview dashboard.
- Build orders.
- Build products and inventory.
- Add functional filters and tables.

## Phase 3: Financial intelligence
- Implement centralized money calculations.
- Build product-level profitability.
- Build settlement reconciliation.
- Build returns analytics.
- Build advertising analytics.

## Phase 4: Operational workflows
- Build CSV imports and exports.
- Add reports.
- Add insight generation.
- Add integration status management.

## Phase 5: Quality
- Add tests.
- Fix TypeScript errors.
- Run linting.
- Verify database migrations.
- Test critical workflows.
- Review responsive behavior.
- Remove broken links and dead buttons.

Do not stop after generating the first screen. Continue through the implementation phases.

If a critical infrastructure dependency is unavailable, build the largest functional portion possible and clearly document the remaining blocker.

---

# 22. Definition of Done

The application is considered complete when:

1. It starts locally using documented instructions.
2. Database migrations run successfully.
3. The demo workspace loads with coherent data.
4. Dashboard metrics derive from actual records.
5. Product and order management work.
6. Profitability calculations are centralized and tested.
7. Settlement CSV import and reconciliation work.
8. Inventory alerts are generated from real stock data.
9. Returns and advertising metrics are calculated correctly.
10. Reports export usable CSV files.
11. The application has a consistent, polished design.
12. Critical flows are covered by tests.
13. No major navigation item leads to an empty placeholder page.
14. No simulated marketplace integration is represented as a real connection.
15. Setup instructions and environment variables are documented.

## Final instructions

Begin by inspecting the repository and proposing a short implementation plan.

Then start implementing the application.

Prioritize a beautiful, working product over unnecessary complexity.

Keep the code modular, readable, and type-safe.

Do not fabricate financial metrics or marketplace synchronization results.

After implementation, report:
- What was built.
- Which features work.
- Database and environment setup instructions.
- Commands to run the project.
- Tests executed and their results.
- Any incomplete features or external credentials still required.

**The ultimate goal is to make MarginMint feel like a real SaaS product that an Indian e-commerce seller would trust to understand their business profitability.**