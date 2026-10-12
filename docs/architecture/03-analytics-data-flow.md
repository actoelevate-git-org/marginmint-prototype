# 3. Analytics data flow

How a raw demo record becomes a number on the screen. One pipeline feeds **every** analytics page and CSV report, which is why totals always agree across pages.

## 3.1 Pipeline

![3.1 Pipeline (diagram)](../diagrams/architecture-03-analytics-data-flow-01.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    subgraph seed["data/demo (records only, integer paise)"]
        cat["catalog.ts<br/>25 products · rate card<br/>ANCHOR_DATE 2026-10-11"]
        gen["seed.ts<br/>buildDemoDataset(20261011)"]
        cat --> gen
        gen --> recs["orders · returns · settlements<br/>advertising · expenses · products · listings"]
    end

    subgraph ledger["services/ledger.ts (built once, cached)"]
        facts["LineFact · ReturnFact<br/>AdFact · ExpenseFact<br/>(IST day keys, Money)"]
        scope["scopedLines / scopedReturns<br/>scopedAds / scopedExpenses<br/>(range · marketplace · product)"]
        facts --> scope
    end

    subgraph domain["domain (pure)"]
        cpb["computeProfitBreakdown<br/>net sales → gross → contribution → net"]
        rates["returnRate · roas · acos<br/>salesVelocity · daysOfStockRemaining<br/>inventoryValue · estimatedUnitContribution"]
        rules["generateInsights<br/>7 deterministic rules"]
    end

    subgraph services["services → display models"]
        dash["dashboard"]
        prof["profitability"]
        inv["inventory"]
        other["orders · settlements<br/>returns · advertising"]
        rep["reports → CSV"]
    end

    recs --> facts
    scope -- "profitFor()<br/>unitStatsFor()" --> cpb
    scope --> rates
    cpb --> dash & prof & rep
    rates --> inv & dash & other
    dash --> rules
    rules --> dash
    recs --> other
```

</details>

## 3.2 How one order line becomes facts

![3.2 How one order line becomes facts (diagram)](../diagrams/architecture-03-analytics-data-flow-02.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    o["Example Amazon order (hypothetical)<br/>DELIVERED · shipping ₹65"]
    i1["Item A: MM-104 ×2 @ ₹1,299<br/>discount ₹0 · fee ₹517.64 · cost ₹720"]
    i2["Item B: MM-120 ×1 @ ₹399<br/>discount ₹0 · fee ₹96.82 · cost ₹90"]
    o --> i1 & i2
    alloc["allocateProportionally(₹65, [₹2,598, ₹399])<br/>largest-remainder → exact paise"]
    i1 & i2 --> alloc
    alloc --> f1["LineFact A<br/>gross ₹2,598 · cogs ₹1,440 · fees ₹517.64 · ship ₹56.35"]
    alloc --> f2["LineFact B<br/>gross ₹399 · cogs ₹90 · fees ₹96.82 · ship ₹8.65"]
```

</details>

*Hypothetical order using the real rate card (18% commission + ₹25/unit, ₹65 shipping). The numbers are what the code would produce; shipping parts always sum exactly to the order total.*

## 3.3 Profit chain

![3.3 Profit chain (diagram)](../diagrams/architecture-03-analytics-data-flow-03.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    gross["Gross item sales"] -- "− discounts (kept lines)<br/>− cancelled line value" --> ns["Net sales"]
    ns -- "− COGS<br/>(null if any cost missing)" --> gp["Gross profit"]
    gp -- "− marketplace fees<br/>− shipping & fulfilment" --> cp["Contribution profit"]
    cp -- "− advertising<br/>− refund & return losses<br/>− other expenses" --> np["Net profit"]
    np -- "÷ net sales × 100<br/>(null if sales ≤ 0)" --> m["Net margin %"]
```

</details>

## 3.4 Scope rules (what is included where)

| Fact | `range` filter | `marketplace` filter | `productId` filter |
|------|----------------|----------------------|--------------------|
| Order lines | Order date (IST) | Order's channel | Line's product |
| Returns | Return date (IST) | Return's channel | Returned product |
| Advertising | Metric date | Campaign channel | Campaign SKU |
| Expenses with a channel | Expense date | That channel | ❌ never allocated |
| Shared overhead (no channel) | Expense date | **Only "All"** | ❌ never allocated |
| Inventory | ❌ snapshot | ❌ shared stock | Product |
| Pending settlements | ❌ as of last sync | Channel | — |

## 3.5 Reconciliation guarantees (tested)

![3.5 Reconciliation guarantees (diagram)](../diagrams/architecture-03-analytics-data-flow-04.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart LR
    a["Σ marketplace rows' net profit"] -- "− shared overhead" --> t["Workspace net profit"]
    b["Σ product net profit"] -- "− unallocated expenses" --> t
    c["P&L CSV 'Net profit' row"] -- "equals" --> t
    d["Independent recompute of net sales<br/>from raw orders"] -- "equals" --> e["Dashboard net sales KPI"]
```

</details>

All four equalities are asserted in `src/services/dashboard.test.ts`.

## 3.6 Insight generation

![3.6 Insight generation (diagram)](../diagrams/architecture-03-analytics-data-flow-05.svg)

<details>
<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>

```mermaid
flowchart TB
    pp["getProductPerformance(scope)<br/>per product: profit, units, returns,<br/>stock, 30-day velocity, days of cover"]
    ws["Workspace signals<br/>settlements needing review (as of sync)<br/>ad spend & net sales: current vs prior (if history covers it)"]
    pp -- "toProductSignal" --> eng
    ws --> eng
    eng["generateInsights(thresholds)"]
    eng --> r1["stock-out risk / below reorder point"]
    eng --> r2["loses money after ads (≥ ₹500)"]
    eng --> r3["high revenue, low margin"]
    eng --> r4["high return rate (≥15%, ≥5 units)"]
    eng --> r5["settlement discrepancy"]
    eng --> r6["ad spend outpacing sales"]
    r1 & r2 & r3 & r4 & r5 & r6 --> sort["dedupe by id · sort by severity, then impact"]
    sort --> link["dashboard adds link (keeps filters):<br/>/products · /profitability · /returns · /settlements · /advertising"]
```

</details>
