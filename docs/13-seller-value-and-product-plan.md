# 13. Seller value & product plan

> **Who this is for:** the founder and anyone deciding *what to build next*. The other docs explain how the code works. This one explains **why a seller would need MarginMint, what is missing before it actually helps them, and how to prove the idea before building more.**
>
> Written: 12 Oct 2026. Revisit after the first seller interviews.

---

## 13.1 The seller's real problem

Picture a seller doing ₹5 lakh a month on Amazon and Flipkart. Their dashboards show **sales**. Nobody shows them **profit**.

| Pain | What it looks like day to day | What it costs them |
|------|-------------------------------|--------------------|
| **Sales ≠ profit** | "I sold ₹5 lakh this month." After commission, closing fee, shipping, GST, returns, ads and product cost, they don't know whether they made ₹40,000 or lost ₹10,000. | Wrong decisions about pricing, stock and ads |
| **Payouts don't match** | Money arrives every few days with deductions they can't explain: fees, penalties, TCS/TDS, return charges. Checking line by line in Excel takes hours, so they don't. | Money silently lost to marketplace errors |
| **Returns and RTO leak margin** | A cash-on-delivery order comes back unopened. They paid shipping both ways, and the product is sometimes damaged. They don't know which SKUs or pin codes cause it. | Often the biggest hidden loss |
| **Best-seller trap** | A SKU sells 500 units a month and feels like a win. It actually makes ₹3 per unit. A slow SKU makes ₹150 per unit. | Capital and ad money spent on the wrong products |
| **Ads are a black box** | They spend ₹50,000 a month on ads and can't tell whether it's profitable after all costs. | Burned ad budget |
| **Stock surprises** | A good product runs out, or slow stock sits for months. | Lost sales, blocked cash |

**What sellers use today:** Excel, a month-end accountant, or guessing. **Excel is the real competitor**, more than any software.

---

## 13.2 Who the customer is

| Seller type | Need for MarginMint | Why |
|-------------|---------------------|-----|
| Small, under ~100 orders/month, one marketplace | Low | Excel is good enough; won't pay |
| **Growing, ~500–10,000 orders/month, 2+ marketplaces** | **High: target customer** | Too much volume for Excel, too small for an ERP or analyst |
| Large brand | Low | Already has ERPs, analysts and tools like Unicommerce |

**Ideal first customer:** an Indian seller on Amazon *and* Flipkart, 20–300 SKUs, a few lakh to a few crore in monthly sales, owner still doing the numbers personally.

---

## 13.3 Honest status: does it help a seller today?

**Not yet.** Today MarginMint shows:

- a polished dashboard **on demo data**, and
- a list of real synced orders, which the seller can already see in Seller Central or the Flipkart Seller Hub.

The engineering foundation is solid: correct money math, secure token storage, and a reliable, resumable sync. But the features that create value (real profit, settlement checks, return losses) don't run on real data yet. See [Known gaps](12-known-gaps-and-roadmap.md).

---

## 13.4 What must be added before it is useful

Ordered by what makes a seller pay. Each item says **why the seller cares**.

### Must-have (the product)

| # | Feature | Why the seller cares | Notes |
|---|---------|----------------------|-------|
| 1 | **Login & private workspace** | They won't connect their account to an app anyone can open | Blocks everything with real data |
| 2 | **Live sync proven on one real account** | Nothing else matters if real orders don't come in correctly | Start with Amazon; fix whatever the real API returns |
| 3 | **Product cost (COGS) in 2 minutes** | Profit is impossible without it | CSV upload of SKU → unit cost, plus inline edit. Missing cost stays *unknown*, never ₹0 |
| 4 | **Marketplace fees per order** | Commission, closing fee, shipping fee and fixed fees are most of the gap between sales and profit | Amazon financial events / settlement reports; Flipkart payments data |
| 5 | **GST handled correctly** | Indian marketplace prices are usually GST-inclusive. Counting GST as income overstates profit by ~5–18%, and sellers will stop trusting the numbers | **Verify on real payloads first.** The current code assumes prices exclude tax (see [Financial logic](04-financial-logic.md)) |
| 6 | **Real profit per order, per SKU, per month** | The core promise: "this SKU is losing you money" | Point the existing ledger and dashboard at database data instead of the demo seed |
| 7 | **Settlement reconciliation** | Shows money the marketplace owes them: "Flipkart under-paid ₹8,400 on these 23 orders." **The tool pays for itself.** | Expected vs actual per order, TCS/TDS shown separately, list of mismatches to raise as claims |
| 8 | **Returns vs RTO, with costs** | Usually the largest hidden loss in India, especially on COD | Separate customer returns from courier RTO; show cost per SKU and per pin code / state |
| 9 | **Automatic daily sync** | Manual "Sync now" means stale numbers | Scheduled job; the sync engine is already resumable and locked |

### Should-have (makes it sticky)

| Feature | Why the seller cares |
|---------|----------------------|
| **Action list, not just charts** | "Raise price on SKU X", "Pause ads on SKU Y", "Reorder Z in 9 days". Sellers want decisions, not graphs |
| **Ad spend per SKU (Amazon Ads, Flipkart Ads)** | True profit after ads, and which campaigns to cut |
| **Weekly WhatsApp / email summary** | Sellers live on WhatsApp, not in dashboards: "Last week: ₹42,300 profit, 3 loss-making SKUs, ₹2,100 unclaimed" |
| **Claim helper** | Pre-filled list of disputed orders with evidence, ready to raise with the marketplace |
| **Stock alerts based on real sales speed** | Avoid stock-outs on profitable items and dead stock on the rest |
| **Accountant export** | Clean monthly export for their CA (GST-ready summaries) |

### Later (only after paying customers)

- Shopify / own website (D2C) and Meesho.
- Multi-user roles (owner, staff, accountant).
- Price simulator: "what if I sell at ₹499 instead of ₹549?"
- Pin code / courier performance analytics.
- Mobile-friendly app.

---

## 13.5 What would make a seller leave

| Trust killer | How to avoid it |
|--------------|-----------------|
| **A number is wrong even once** (e.g. GST counted as income) | Validate every formula against a real seller's Excel before launch; show "estimated" and "incomplete" labels honestly |
| Weekly manual data entry | Enter costs once; everything else syncs automatically |
| Setup takes more than ~10 minutes | Connect account → upload costs → see profit. Nothing else at first |
| Charts with no action | Every screen should answer "what should I do?" |
| Their data feels unsafe | Login, private workspaces, encrypted tokens, clear privacy statement |

---

## 13.6 Competition and our edge

| Alternative | What it does well | Gap we can fill |
|-------------|-------------------|-----------------|
| **Excel + accountant** | Free, flexible, familiar | Slow, error-prone, done monthly or never |
| Unicommerce, EasyEcom | Multi-channel operations (orders, inventory) | Built for operations, not deep profit or settlement checks for small sellers |
| SellerApp, Sellerboard, Helium 10 | Amazon analytics and profit | Amazon-first; weaker on Flipkart and Indian specifics (GST, RTO, COD) |

**Possible edge, to be validated by interviews:**

1. **Flipkart + Amazon settlement reconciliation** that finds money owed. It's painful and underserved.
2. **Honest per-SKU profit built for India**: GST, RTO, COD and TCS/TDS done right.
3. **Simplicity and price** for the growing seller that big tools ignore.

---

## 13.7 Pricing hypothesis (to test, not decided)

| Plan | Price / month | For |
|------|---------------|-----|
| Starter | ~₹999 | 1 marketplace, up to ~1,000 orders/month |
| Growth | ~₹2,499 | 2+ marketplaces, settlement reconciliation, alerts |
| Pro | ~₹4,999+ | High volume, multiple users, accountant export |

**Strongest sales pitch:** *"If MarginMint doesn't find more money than it costs, don't pay."* Settlement recovery makes that promise possible.

---

## 13.8 Prove it before building more

The biggest risk is not the code. It's whether sellers will pay. Test that first.

### Step 1: Talk to 5–10 target sellers (1–2 weeks)

Find them in Facebook, WhatsApp and Telegram seller groups, or through local seller meetups and CA firms that serve sellers. Ask:

1. How do you know your profit per product today?
2. How do you check that your marketplace payouts are correct? How long does it take?
3. What was the last time you found a wrong deduction? How much was it?
4. How much do returns and RTO cost you? Do you know which products cause them?
5. What tools or Excel sheets do you use now? Can you show me?
6. If this were automatic and accurate, would you pay ₹1,500 a month? Why or why not?

**Signal to continue:** at least half say "Excel, and it's painful", and at least 2–3 say they'd pay or want to try it with their real data.

### Step 2: Manual pilot (a "concierge MVP")

Before building settlement and fee import, take one seller's real reports (orders, payments, costs) and produce their profit and mismatch report **using MarginMint's existing formulas plus some manual work**. If the report surprises them ("I didn't know this SKU was losing money", "I'm owed ₹6,000"), the product is proven. Then automate exactly what they valued.

### Step 3: Build the smallest real loop

Login → connect Amazon → upload costs → fees and settlements import → real profit per SKU + mismatch list. One marketplace, done well.

---

## 13.9 Suggested 90-day plan

| Weeks | Goal | Done when |
|-------|------|-----------|
| 1–2 | Seller interviews | 5–10 conversations written up; clear yes or no on the pain |
| 2–4 | Login + first live Amazon sync + verify GST on real data | One real seller's orders sync correctly and privately |
| 4–7 | Cost upload + fee/settlement import (Amazon) | Real profit per SKU for one real seller |
| 7–9 | Settlement mismatch list + returns/RTO cost | Shows at least one real seller money they were owed or losing |
| 9–12 | Daily auto-sync, weekly summary, 3–5 pilot sellers | At least one seller willing to pay |
| After | Flipkart fees/settlements, then ads, then Shopify | Driven by what pilot sellers ask for |

**Rule for this period:** no new pages, docs or providers until one real seller says *"this showed me something I didn't know."*

---

## 13.10 Success measures

- **Interviews:** at least 50% confirm the pain; 2–3 want to try it.
- **Pilot:** at least 1 seller finds a loss-making SKU or a payout mismatch they didn't know about.
- **Activation:** connect → costs uploaded → first profit view in under 15 minutes.
- **Retention:** pilot sellers open it (or read the weekly summary) every week.
- **Revenue:** first paying seller within ~90 days.
