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

Not yet built: persistence (Prisma/PostgreSQL), authentication, CSV import, settlement matching workflow, product editing, marketplace API connections.
