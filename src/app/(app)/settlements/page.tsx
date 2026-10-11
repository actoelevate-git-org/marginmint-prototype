import { CircleDollarSign, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/ui/search-form";
import { SortHeader } from "@/components/ui/sort-header";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabLinks } from "@/components/ui/tab-links";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { SETTLEMENT_STATUSES, type SettlementStatus } from "@/data/demo/types";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseEnum, parseGlobalFilters, parsePage, parseSearchText, parseSort, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";
import { orderHref } from "@/services/orders";
import { getSettlementsView, SETTLEMENT_SORT_KEYS, SETTLEMENT_STATUS_LABEL } from "@/services/settlements";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Settlements" };
const PATH = "/settlements";

export default async function SettlementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const status = parseEnum<SettlementStatus | "ALL">(params.status, ["ALL", ...SETTLEMENT_STATUSES], "ALL");
  const q = parseSearchText(params.q);
  const sort = parseSort(params, SETTLEMENT_SORT_KEYS, { key: "date", dir: "desc" });
  const view = getSettlementsView({ ...filters, status, q, sort, page: parsePage(params.page) });
  const s = view.summary;
  const visibleStatuses = SETTLEMENT_STATUSES.filter((st) => view.statusCounts[st] > 0 || st === status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settlements"
        description={`${marketplaceFilterLabel(filters.marketplace)} · transactions dated ${describeRange(filters.range)}. Payouts are cash movements, never sales.`}
        actions={
          <a href={`/api/reports/settlements?${globalFilterQuery(filters).toString()}`} className={buttonVariants({ variant: "secondary" })} download>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <StatGrid>
        <StatTile label="Expected payouts" value={s.expected} hint={`${s.transactionCount} transactions`} tooltip="Proceeds the channels should remit after their own fees, per our rate card." />
        <StatTile label="Received" value={s.received} tooltip="Cash actually received for settled transactions." />
        <StatTile label="Matched" value={s.matched} tooltip="Received amounts that exactly match an order reference and expected amount." />
        <StatTile label="Awaiting payout" value={s.awaiting} hint={`${s.awaitingCount} not yet due or paid`} />
        <StatTile
          label="Outstanding difference"
          value={s.outstandingDifference}
          tone={s.outstandingKind === "under" ? "negative" : "default"}
          hint={s.outstandingKind === "under" ? "Net underpaid" : s.outstandingKind === "over" ? "Net additional credit" : "Nothing outstanding"}
          tooltip="Difference = actual received − expected, summed over transactions needing review. Negative = you were underpaid. Positive = unexplained additional credit to confirm."
        />
        <StatTile label="Needs review" value={s.reviewCount} tone={s.reviewCount > 0 ? "warning" : "default"} hint="Differences not yet explained" />
      </StatGrid>

      <Notice>
        Matching here is by exact order reference. CSV statement import, the multi-rule matching engine and the review workflow (with required
        explanations and audit history) arrive in the reconciliation phase; nothing is auto-reconciled silently.
      </Notice>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <TabLinks
            label="Reconciliation status"
            items={[
              { label: "All", href: hrefWith(PATH, params, { status: null }), active: status === "ALL", count: s.transactionCount },
              ...visibleStatuses.map((st) => ({
                label: SETTLEMENT_STATUS_LABEL[st],
                href: hrefWith(PATH, params, { status: st }),
                active: status === st,
                count: view.statusCounts[st],
              })),
            ]}
          />
          <SearchForm pathname={PATH} params={params} label="Search settlements" placeholder="Transaction or order ID" />
        </div>
        {view.page.total === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="No settlement transactions"
            description="Nothing matches these filters. Try another status or a wider date range."
            action={
              <Link href={hrefWith(PATH, params, { status: null, q: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Clear status and search
              </Link>
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table className="min-w-[1180px]">
                <THead>
                  <tr>
                    <Th className="pl-4">Transaction</Th>
                    <Th>Marketplace</Th>
                    <Th>Order</Th>
                    <SortHeader label="Date" sortKey="date" current={sort} pathname={PATH} params={params} />
                    <Th>Type</Th>
                    <SortHeader label="Expected" sortKey="expected" current={sort} pathname={PATH} params={params} align="right" />
                    <SortHeader label="Actual" sortKey="actual" current={sort} pathname={PATH} params={params} align="right" />
                    <SortHeader label="Difference" sortKey="difference" current={sort} pathname={PATH} params={params} align="right" />
                    <Th>Status</Th>
                    <Th className="pr-4">Notes</Th>
                  </tr>
                </THead>
                <TBody>
                  {view.page.rows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="pl-4 font-mono text-xs">{row.id}</Td>
                      <Td>{row.marketplace}</Td>
                      <Td>
                        {row.orderId ? (
                          <Link href={orderHref(row.orderId)} className="font-mono text-xs text-forest hover:underline">
                            {row.orderId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="text-slate-600">{row.date}</Td>
                      <Td className="text-slate-600">{row.type}</Td>
                      <Td align="right">{row.expected}</Td>
                      <Td align="right" className={cn(!row.received && "text-muted")}>
                        {row.actual}
                      </Td>
                      <Td
                        align="right"
                        className={cn("font-medium", row.differenceKind === "under" && "text-loss-text", row.differenceKind === "over" && "text-warning-text")}
                      >
                        {row.difference}
                        {row.differenceKind === "under" ? <span className="sr-only"> (underpaid)</span> : null}
                        {row.differenceKind === "over" ? <span className="sr-only"> (overpaid)</span> : null}
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} label={row.statusLabel} />
                      </Td>
                      <Td className="max-w-[280px] whitespace-normal pr-4 text-xs text-slate-600">{row.notes}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
            <Pagination page={view.page} pathname={PATH} params={params} noun="transactions" />
          </>
        )}
      </Card>
    </div>
  );
}
