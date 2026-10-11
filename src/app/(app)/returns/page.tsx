import { Download, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/ui/search-form";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseGlobalFilters, parsePage, parseSearchText, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { getReturnsView } from "@/services/returns";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Returns" };
const PATH = "/returns";

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const q = parseSearchText(params.q);
  const view = getReturnsView({ filters, q, page: parsePage(params.page) });
  const s = view.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Returns & refunds"
        description={`${marketplaceFilterLabel(filters.marketplace)} · ${describeRange(filters.range)}. Return rate is unit-level: returned units ÷ sold units.`}
        actions={
          <a href={`/api/reports/returns?${globalFilterQuery(filters).toString()}`} className={buttonVariants({ variant: "secondary" })} download>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <StatGrid className="xl:grid-cols-4">
        <StatTile label="Return rate" value={s.returnRate} hint={`${s.returnedUnits} of ${s.soldUnits} units`} tooltip="Units returned in the period ÷ units sold in the period. Never mixed with order-level counts." />
        <StatTile label="Refund value" value={s.refundValue} hint={`${s.returnCount} returns`} />
        <StatTile label="Estimated loss" value={s.estimatedLoss} tone="negative" tooltip="Refunds + return shipping − cost of stock recovered into sellable inventory." />
        <StatTile label="Stock recovered" value={s.recoveredCost} hint="At unit cost" />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Return reasons" description="Share of returned units" />
          <CardContent>
            {view.reasons.length === 0 ? (
              <p className="text-[13px] text-muted">No returns in this period.</p>
            ) : (
              <ul className="space-y-2.5">
                {view.reasons.map((r) => (
                  <li key={r.reason}>
                    <div className="flex justify-between text-[13px]">
                      <span>{r.reason}</span>
                      <span className="num text-slate-600">
                        {r.units} · {r.share}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                      <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${r.sharePct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Most returned products" />
          <CardContent>
            {view.topProducts.length === 0 ? (
              <p className="text-[13px] text-muted">No returns in this period.</p>
            ) : (
              <ul className="divide-y divide-line">
                {view.topProducts.map((p) => (
                  <li key={p.sku} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <Link href={hrefWith(PATH, params, { q: p.sku })} className="min-w-0 hover:underline">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="font-mono text-2xs text-muted">{p.sku}</span>
                    </Link>
                    <span className="num shrink-0 text-right">
                      {p.rate}
                      <span className="block text-2xs text-muted">
                        {p.returned}/{p.sold} units
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Return rate by marketplace" description="Ignores the marketplace filter, for comparison" />
          <CardContent>
            <ul className="divide-y divide-line">
              {view.byMarketplace.map((m) => (
                <li key={m.label} className="flex justify-between py-2 text-[13px]">
                  <span>{m.label}</span>
                  <span className="num text-right">
                    {m.rate}
                    <span className="block text-2xs text-muted">
                      {m.returned}/{m.sold} units
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Return records</h2>
          <SearchForm pathname={PATH} params={params} label="Search returns" placeholder="SKU, order or return ID" />
        </div>
        {view.page.total === 0 ? (
          <EmptyState
            icon={Undo2}
            title="No returns"
            description={q ? `No returns match “${q}” in this period.` : "No returns were recorded in this period."}
            action={
              q ? (
                <Link href={hrefWith(PATH, params, { q: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Clear search
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table className="min-w-[1080px]">
                <THead>
                  <tr>
                    <Th className="pl-4">Return</Th>
                    <Th>Order</Th>
                    <Th>Product</Th>
                    <Th align="right">Qty</Th>
                    <Th>Reason</Th>
                    <Th align="right">Refund</Th>
                    <Th align="right">Return shipping</Th>
                    <Th>Recovery</Th>
                    <Th align="right" className="pr-4">
                      Est. loss
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {view.page.rows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="pl-4">
                        <div className="font-mono text-xs">{r.id}</div>
                        <div className="text-2xs text-muted">{r.date}</div>
                      </Td>
                      <Td>
                        <Link href={r.orderHref} className="font-mono text-xs text-forest hover:underline">
                          {r.orderId}
                        </Link>
                        <div className="text-2xs text-muted">{r.marketplace}</div>
                      </Td>
                      <Td>
                        <div>{r.product}</div>
                        <div className="font-mono text-2xs text-muted">{r.sku}</div>
                      </Td>
                      <Td align="right">{r.quantity}</Td>
                      <Td>{r.reason}</Td>
                      <Td align="right">{r.refund}</Td>
                      <Td align="right">{r.returnShipping}</Td>
                      <Td className="text-slate-600">{r.recovered ? "Restocked" : "Not recoverable"}</Td>
                      <Td align="right" className="pr-4 font-medium">
                        {r.loss}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
            <Pagination page={view.page} pathname={PATH} params={params} noun="returns" />
          </>
        )}
      </Card>
    </div>
  );
}
