# 5. Demo data

The demo workspace lets the whole app work with no database and no marketplace accounts. It is **simulated**, and the UI says so everywhere ("Demo workspace" badge, sidebar note, Integrations card).

## 5.1 Golden rule

> `src/data/demo/` only **creates records**. It never computes KPIs.
> Every number on screen is derived from these records by the ledger and the domain formulas.

Tests enforce this:
- Net sales is recomputed independently from raw orders and must match the dashboard.
- An **empty** dataset must show `₹0` sales and an undefined margin.
- Changing a filter must change the figures.

## 5.2 Files

| File | Contents |
|------|----------|
| `catalog.ts` | 25 product definitions (SKU `MM-101`…`MM-125`, name, category, unit cost, price, reorder point, listed channels, demand weight, low-stock flag); the channel **rate card**; `ANCHOR_DATE` and `HISTORY_DAYS` |
| `seed.ts` | `buildDemoDataset(seed = 20261011)`, the generator. `demoDataset` is the exported instance. |
| `rng.ts` | `createRng` (mulberry32), `pick`, `pickWeighted`, `intBetween` |
| `types.ts` | `DemoOrder`, `DemoProduct`, `DemoReturn`, `DemoSettlementTxn`, `DemoAdMetric`, `DemoExpense`… All amounts are **integer paise**. |

## 5.3 Determinism

- Same seed → identical dataset, byte for byte (tested).
- "Today" is fixed at `ANCHOR_DATE = 2026-10-11` (IST). All date presets resolve relative to it, so the demo never drifts as real time passes.
- History covers **95 days** ending on the anchor date. On the anchor day, orders stop at the "last sync" time (14:10 IST), so no order is in the future.

## 5.4 What the seed produces

| Records | Approx. count | How |
|---------|---------------|-----|
| Workspace | 1 | "Acme Commerce India", owner "Priya", INR |
| Products | 25 | Electronics, home & kitchen, apparel, fitness, office, accessories |
| Listings | ~60 | Each product on 2–3 of Amazon, Flipkart, Shopify, D2C |
| Orders | ~190 | 1–3 per day, products picked by **demand weight**; ~15% have a second item |
| Returns | ~25 | From `RETURNED` orders, 3–9 days after delivery; some partial |
| Settlements | ~180 | One per settled order; ~12 awaiting payout; ~1 in 11 has a discrepancy |
| Ad metrics | ~160 | 5 sponsored-product campaigns over 60 days; spend **+40%** in the last 30 days |
| Expenses | 9 | Monthly packaging + software (shared overhead), Amazon storage fees |

### Rate card (demo fees)

| Channel | Commission | Fixed fee / unit | Shipping / order | Settlement lag | Deducts shipping from payout |
|---------|-----------|------------------|------------------|----------------|------------------------------|
| Amazon | 18% | ₹25 | ₹65 | 7 days | Yes |
| Flipkart | 16% | ₹20 | ₹60 | 10 days | Yes |
| Shopify | 2% (gateway) | ₹0 | ₹75 | 3 days | No |
| D2C | 2% (gateway) | ₹0 | ₹80 | 2 days | No |

## 5.5 Story beats built into the data

The seed is shaped so the insight rules have something real to find. These are properties of the **records**, not hardcoded outputs:

- **Laptop Stand (MM-104)** carries heavy Amazon ad spend with low ROAS → loses money after advertising.
- **Cotton T-Shirt (MM-103)** has a sizing problem: extra returns, mostly "Product quality" → high return rate.
- **Wireless Earbuds (MM-101), USB-C Hub (MM-107), Fitness Band (MM-118), USB-C Cable (MM-120)** start with low stock → stock-out risk where sales velocity supports it.
- **Settlement discrepancies:** weight-handling fees (Amazon), shipping reversals (Flipkart), gateway fee mismatches (Shopify/D2C), plus a rare unexplained **overpayment**.
- **Ad spend ramp:** campaigns spend ~40% more in the latest 30 days.

With the default 30-day view, the business shows about **₹1.23 L net sales and ~17% net margin**, a realistic small seller.

## 5.6 Changing the demo data

- To tweak behaviour, change `catalog.ts` or the generator in `seed.ts`. Never "fix" a number in a service.
- Run `npm test`. `services/dashboard.test.ts` checks the dataset shape (25 products, 100–200 orders, all four channels, some settlements needing review) and that all totals reconcile.
- If you change the seed and an insight disappears, that may be correct. Insights fire only when the data supports them.
