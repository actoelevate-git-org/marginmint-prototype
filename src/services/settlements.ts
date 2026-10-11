import { demoDataset } from "@/data/demo/seed";
import { SETTLEMENT_STATUSES, type DemoDataset, type DemoSettlementTxn, type SettlementStatus, type SettlementType } from "@/data/demo/types";
import { settlementDifference } from "@/domain/finance";
import { formatInr, Money } from "@/domain/money";
import { dayKeyOf, diffDays, formatDayLong, isInstantInRange, type DateRange } from "@/lib/dates";
import { MARKETPLACE_LABEL, type MarketplaceFilter } from "@/lib/marketplaces";
import { compareNullable, paginate, type Page } from "@/lib/pagination";
import type { SortDirection } from "@/lib/search-params";

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  MATCHED: "Matched",
  PARTIALLY_MATCHED: "Partially matched",
  UNMATCHED: "Awaiting payout",
  NEEDS_REVIEW: "Needs review",
  EXCLUDED: "Excluded",
};

export const SETTLEMENT_TYPE_LABEL: Record<SettlementType, string> = {
  ORDER_PROCEEDS: "Order proceeds",
  COMMISSION: "Commission",
  FULFILLMENT_FEE: "Fulfilment fee",
  ADVERTISING: "Advertising",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
  TAX_WITHHOLDING: "Tax withholding",
  SETTLEMENT_PAYOUT: "Payout",
};

function matchesMarketplace(txn: DemoSettlementTxn, marketplace: MarketplaceFilter): boolean {
  return marketplace === "ALL" || txn.marketplace === marketplace;
}

function differenceOf(txn: DemoSettlementTxn): Money {
  return settlementDifference({ expected: Money.fromMinor(txn.expectedPaise), actual: Money.fromMinor(txn.actualPaise) });
}

/** Expected proceeds not yet received, as of the last sync (not date-filtered). */
export function pendingPayouts(marketplace: MarketplaceFilter, dataset: DemoDataset = demoDataset) {
  const open = dataset.settlements.filter((txn) => txn.status === "UNMATCHED" && matchesMarketplace(txn, marketplace));
  const oldest = open.reduce<string | null>((min, txn) => {
    const day = dayKeyOf(txn.occurredAt);
    return min === null || day < min ? day : min;
  }, null);
  return {
    count: open.length,
    amount: open.reduce((sum, txn) => sum.add(Money.fromMinor(txn.expectedPaise)), Money.zero()),
    oldestAgeDays: oldest ? diffDays(oldest, dataset.workspace.today) : null,
  };
}

/** Received-but-unreconciled differences, as of the last sync (not date-filtered). */
export function reviewDiscrepancies(marketplace: MarketplaceFilter, dataset: DemoDataset = demoDataset) {
  const review = dataset.settlements.filter((txn) => txn.status === "NEEDS_REVIEW" && matchesMarketplace(txn, marketplace));
  const diffs = review.map(differenceOf);
  return {
    count: review.length,
    netDifference: diffs.reduce((sum, d) => sum.add(d), Money.zero()),
    absoluteDifference: diffs.reduce((sum, d) => sum.add(d.abs()), Money.zero()),
  };
}

export const SETTLEMENT_SORT_KEYS = ["date", "expected", "actual", "difference"] as const;
export type SettlementSortKey = (typeof SETTLEMENT_SORT_KEYS)[number];

export type SettlementRow = {
  id: string;
  marketplace: string;
  orderId: string | null;
  date: string;
  type: string;
  expected: string;
  actual: string;
  received: boolean;
  difference: string;
  differenceKind: "none" | "under" | "over" | "pending";
  status: SettlementStatus;
  statusLabel: string;
  notes: string;
};

export type SettlementsView = {
  summary: {
    expected: string;
    received: string;
    matched: string;
    awaiting: string;
    awaitingCount: number;
    outstandingDifference: string;
    outstandingKind: "none" | "under" | "over";
    reviewCount: number;
    transactionCount: number;
  };
  page: Page<SettlementRow>;
  statusCounts: Record<SettlementStatus, number>;
};

export function getSettlementsView(
  args: {
    range: DateRange;
    marketplace: MarketplaceFilter;
    status: SettlementStatus | "ALL";
    q: string;
    sort: { key: SettlementSortKey; dir: SortDirection };
    page: number;
  },
  dataset: DemoDataset = demoDataset,
): SettlementsView {
  const inScope = dataset.settlements.filter(
    (txn) => isInstantInRange(txn.occurredAt, args.range) && matchesMarketplace(txn, args.marketplace),
  );

  const statusCounts = Object.fromEntries(SETTLEMENT_STATUSES.map((s) => [s, 0])) as Record<SettlementStatus, number>;
  for (const txn of inScope) statusCounts[txn.status] += 1;

  const total = (rows: DemoSettlementTxn[], pick: (t: DemoSettlementTxn) => number) =>
    rows.reduce((sum, txn) => sum.add(Money.fromMinor(pick(txn))), Money.zero());
  const received = inScope.filter((txn) => txn.status !== "UNMATCHED");
  const review = inScope.filter((txn) => txn.status === "NEEDS_REVIEW");
  const awaiting = inScope.filter((txn) => txn.status === "UNMATCHED");
  const outstanding = review.reduce((sum, txn) => sum.add(differenceOf(txn)), Money.zero());

  const q = args.q.toLowerCase();
  const filtered = inScope.filter(
    (txn) =>
      (args.status === "ALL" || txn.status === args.status) &&
      (!q || txn.id.toLowerCase().includes(q) || (txn.orderId ?? "").toLowerCase().includes(q)),
  );

  const { key, dir } = args.sort;
  const sorted = [...filtered].sort((a, b) => {
    switch (key) {
      case "expected":
        return compareNullable(a.expectedPaise, b.expectedPaise, (x, y) => x - y, dir);
      case "actual":
        return compareNullable(
          a.status === "UNMATCHED" ? null : a.actualPaise,
          b.status === "UNMATCHED" ? null : b.actualPaise,
          (x, y) => x - y,
          dir,
        );
      case "difference":
        return compareNullable(
          a.status === "UNMATCHED" ? null : differenceOf(a),
          b.status === "UNMATCHED" ? null : differenceOf(b),
          (x, y) => x.cmp(y),
          dir,
        );
      case "date":
      default:
        return compareNullable(a.occurredAt, b.occurredAt, (x, y) => x.localeCompare(y), dir);
    }
  });

  const page = paginate(sorted, args.page);
  return {
    summary: {
      expected: formatInr(total(inScope, (t) => t.expectedPaise), { decimals: 0 }),
      received: formatInr(total(received, (t) => t.actualPaise), { decimals: 0 }),
      matched: formatInr(total(inScope.filter((t) => t.status === "MATCHED"), (t) => t.actualPaise), { decimals: 0 }),
      awaiting: formatInr(total(awaiting, (t) => t.expectedPaise), { decimals: 0 }),
      awaitingCount: awaiting.length,
      outstandingDifference: formatInr(outstanding, { decimals: 0, signDisplay: "always" }),
      outstandingKind: outstanding.isZero() ? "none" : outstanding.isNegative() ? "under" : "over",
      reviewCount: review.length,
      transactionCount: inScope.length,
    },
    statusCounts,
    page: {
      ...page,
      rows: page.rows.map((txn) => {
        const pending = txn.status === "UNMATCHED";
        const diff = differenceOf(txn);
        return {
          id: txn.id,
          marketplace: MARKETPLACE_LABEL[txn.marketplace],
          orderId: txn.orderId,
          date: formatDayLong(dayKeyOf(txn.occurredAt)),
          type: SETTLEMENT_TYPE_LABEL[txn.type],
          expected: formatInr(Money.fromMinor(txn.expectedPaise)),
          actual: pending ? "Not received" : formatInr(Money.fromMinor(txn.actualPaise)),
          received: !pending,
          difference: pending ? "—" : formatInr(diff, { signDisplay: "always" }),
          differenceKind: pending ? "pending" : diff.isZero() ? "none" : diff.isNegative() ? "under" : "over",
          status: txn.status,
          statusLabel: SETTLEMENT_STATUS_LABEL[txn.status],
          notes: txn.notes,
        };
      }),
    },
  };
}
