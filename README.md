# MarginMint

Every sale. Every cost. Your real profit. Seller operations and profit intelligence for Indian e-commerce.

Phase 1 runs entirely on a seeded demo workspace ("Acme Commerce India"). No database, credentials or environment variables are needed.

```bash
npm install
npm run dev        # http://localhost:3000 → /overview
npm test           # domain + service tests
npm run typecheck && npm run lint && npm run build
```

All dashboard figures are derived from the seeded records in `src/data/demo/seed.ts` through `src/services/ledger.ts` and the formulas in `src/domain/finance.ts`. See `AGENTS.md` for architecture and Settings → Accounting policies in the app for metric definitions.

## Amazon & Flipkart order sync

Optional. Without configuration the app runs on demo data and the Integrations page lists exactly which variables are missing.

1. Create a Neon database and set `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct). Run `npm run db:migrate`.
2. Set `APP_URL` and `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
3. **Amazon:** register as an SP-API developer, create an app with the *Orders* role, and set its OAuth redirect URI to `{APP_URL}/api/integrations/amazon/callback`. Set `AMAZON_SPAPI_APP_ID`, `AMAZON_LWA_CLIENT_ID` and `AMAZON_LWA_CLIENT_SECRET`. Keep `AMAZON_SPAPI_DRAFT_APP=true` until the app is published in the Selling Partner Appstore.
4. **Flipkart:** create a third-party application in Seller Hub with redirect URI `{APP_URL}/api/integrations/flipkart/callback`. Set `FLIPKART_CLIENT_ID` and `FLIPKART_CLIENT_SECRET`. Point `FLIPKART_API_HOST` at the sandbox while testing.
5. Open **Integrations → Connect**, approve on the marketplace, then **Sync orders now**. Orders appear under **Orders → Synced from marketplaces**.

See `.env.example` for every variable. Never commit real values.

⚠️ **There is no login yet.** Anyone who can reach a deployment with real credentials configured can connect accounts and read synced orders. Keep real credentials off public deployments until authentication is added.

Not yet built: authentication, scheduled background sync, synced-order detail and profit (dashboard still uses demo data), Flipkart returns, CSV import, settlement matching workflow, product editing.
