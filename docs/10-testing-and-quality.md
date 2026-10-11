# 10. Testing & quality

## 10.1 Test suites

| Command | What runs | Needs |
|---------|-----------|-------|
| `npm test` | **102** unit and service tests (Vitest) | Nothing (no network, no database) |
| `npm run test:db` | **4** real-database tests | `.env.local` with `DATABASE_URL` |

### What is covered

| File | Covers |
|------|--------|
| `domain/money.test.ts` | Exact paise arithmetic, half-up rounding, Indian grouping, negatives, compact format, unknown → fallback |
| `domain/finance.test.ts` | Full profit chain, missing COGS → unknown, negative profit, zero/negative sales margin, % change against a negative base, pp change, settlement sign, stock and inventory edge cases, insufficient history, ROAS/ACOS/return rate zero denominators, largest-remainder allocation, unit contribution |
| `domain/insights.test.ts` | Each rule fires and stays silent correctly, materiality threshold, no ad blame without ad spend, minimum sample for return rate, prior-period requirement, severity sort, no duplicate IDs |
| `lib/dates.test.ts` | Whole-day IST presets, custom range validation and fallback, previous range, IST bucketing at the midnight boundary, Monday weeks |
| `lib/csv/csv.test.ts` | Formula-injection escaping, numbers stay numeric, quoting |
| `services/dashboard.test.ts` | Seed reproducibility and shape; **net sales recomputed independently from raw orders**; empty dataset → ₹0; filters change figures; no fake comparison for 90 days; **marketplace rows + overhead = total**; **product totals reconcile**; P&L export = dashboard; every report builds; insights link to real routes |
| `lib/crypto/token-cipher.test.ts` | Round trip, fresh IV, tamper and wrong-key rejection, key validation |
| `integrations/__tests__/http.test.ts` | Retry honouring `Retry-After`, no retry on 401, no secrets in errors, bounded network retries, non-JSON bodies |
| `integrations/__tests__/amazon.test.ts` | India consent URL (+ `version=beta`), callback parsing, LWA form exchange, EU endpoint, **no PII datasets requested**, money mapping, status mapping, unpriced orders, pagination + resume, malformed responses, cursor validation |
| `integrations/__tests__/flipkart.test.ts` | Authorize URL, Basic auth + real state in the exchange, all six segments + `nextPageUrl`, **foreign-host rejection**, grouping, IST dates, float → paise, status derivation, cancelled-item exclusion |
| `services/integrations/integrations.test.ts` | OAuth: hashed state, encrypted tokens, cookie mismatch, single use, expiry, decline, exchange failure, disconnect keeps orders. Sync: not connected, page budget + resume, idempotency, in-page duplicates, cross-page item merge, token refresh, reauth on 401, rate-limit keeps progress, concurrent lock, end-to-end with the real Flipkart adapter. Listing: IST range, provider filter, unpriced display, workspace isolation. Status: missing-config names, connected only with stored tokens. |
| `repositories/prisma-integration-repository.db.test.ts` | Real PostgreSQL: concurrent single-use state, JSON cursor, **100-order bulk upsert**, UTC timestamps, decimals, item replacement, duplicate rejection, listing, sync lock |

### How provider APIs are tested without credentials

Adapter tests use **fixtures shaped exactly like each provider's published response schema** (Amazon's `orders_2026-01-01.json` model, Flipkart's Order Management v3 reference) and a mocked `fetch`. They prove our requests and mapping match the documentation. They cannot prove the live services behave as documented; that is what the checklist in [Integrations §7.9](07-marketplace-integrations.md#79-checklist-for-the-first-live-test) is for.

## 10.2 Definition of done for a change

```bash
npm run typecheck    # 0 errors (strict)
npm run lint         # 0 warnings
npm test             # all pass
npm run build        # succeeds
npm run test:db      # if you touched prisma/ or src/repositories/
```

Plus, for UI changes:
- Check the page at desktop width **and** at 400 px with real device emulation. No page may scroll sideways.
- Check the empty, loading and error states.
- No new fake buttons; anything unfinished is disabled with a reason.

## 10.3 Verification that has been done

- All pages and routes were exercised against a production build (`next start`): every nav route returns 200, CSV downloads carry correct headers, and unknown reports return 404.
- Integration routes were exercised in three configurations: **no config**, **fake credentials + unreachable database**, and **real Neon database**. Each degrades to a clear message; server logs contain no secrets.
- Security checks: cross-site POST → 403, missing Origin → 403, GET connect → 405, unknown provider → 404, no reflected text.
- Visual checks were done with headless Chrome screenshots (desktop) and DevTools-protocol device emulation (400 px). Every page was measured with `scrollWidth = 400`.

## 10.4 Not yet tested

- Live Amazon/Flipkart accounts (no credentials yet)
- End-to-end browser tests (Playwright is in the spec but not installed)
- Load and performance beyond a single 100-order page
