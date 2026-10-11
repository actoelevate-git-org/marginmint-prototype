import { Download, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/ui/search-form";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabLinks } from "@/components/ui/tab-links";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ORDER_STATUSES, type OrderStatus } from "@/data/demo/types";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseEnum, parseGlobalFilters, parsePage, parseSearchText, parseSort, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { listOrders, ORDER_SORT_KEYS, ORDER_STATUS_LABEL } from "@/services/orders";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Orders" };
const PATH = "/orders";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const status = parseEnum<OrderStatus | "ALL">(params.status, ["ALL", ...ORDER_STATUSES], "ALL");
  const q = parseSearchText(params.q);
  const sort = parseSort(params, ORDER_SORT_KEYS, { key: "date", dir: "desc" });
  const page = listOrders({ ...filters, status, q, sort, page: parsePage(params.page) });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description={`${marketplaceFilterLabel(filters.marketplace)} · ${describeRange(filters.range)}. Customer references are synthetic; no personal data is stored.`}
        actions={
          <a href={`/api/reports/orders?${globalFilterQuery(filters).toString()}`} className={buttonVariants({ variant: "secondary" })} download>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <TabLinks
            label="Order status"
            items={(["ALL", ...ORDER_STATUSES] as const).map((s) => ({
              label: s === "ALL" ? "All" : ORDER_STATUS_LABEL[s],
              href: hrefWith(PATH, params, { status: s === "ALL" ? null : s }),
              active: status === s,
              count: page.statusCounts[s],
            }))}
          />
          <SearchForm pathname={PATH} params={params} label="Search orders" placeholder="Order ID, customer ref or SKU" />
        </div>
        {page.total === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No orders match"
            description={q ? `Nothing matches “${q}” in this period. Check the ID or widen the date range.` : "No orders in this period and status. Try a wider date range."}
            action={
              <Link href={hrefWith(PATH, params, { q: null, status: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Clear search and status
              </Link>
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table className="min-w-[1080px]">
                <THead>
                  <tr>
                    <Th className="pl-4">Order ID</Th>
                    <SortHeader label="Date" sortKey="date" current={sort} pathname={PATH} params={params} />
                    <Th>Marketplace</Th>
                    <Th>Customer ref</Th>
                    <SortHeader label="Units" sortKey="units" current={sort} pathname={PATH} params={params} align="right" />
                    <SortHeader label="Order value" sortKey="value" current={sort} pathname={PATH} params={params} align="right" />
                    <Th align="right">Discounts</Th>
                    <Th>Status</Th>
                    <Th>Fulfilment</Th>
                    <Th className="pr-4">Settlement</Th>
                  </tr>
                </THead>
                <TBody>
                  {page.rows.map((order) => (
                    <Tr key={order.id}>
                      <Td className="pl-4">
                        <Link href={order.href} className="font-mono text-xs font-medium text-forest hover:underline">
                          {order.id}
                        </Link>
                      </Td>
                      <Td className="text-slate-600">{order.date}</Td>
                      <Td>{order.marketplace}</Td>
                      <Td className="font-mono text-xs text-slate-600">{order.customerRef}</Td>
                      <Td align="right">
                        {order.units}
                        {order.products > 1 ? <span className="ml-1 text-2xs text-muted">({order.products} SKUs)</span> : null}
                      </Td>
                      <Td align="right" className="font-medium">
                        {order.value}
                      </Td>
                      <Td align="right" className="text-slate-600">
                        {order.discount}
                      </Td>
                      <Td>
                        <StatusBadge status={order.status} label={order.statusLabel} />
                      </Td>
                      <Td className="text-slate-600">{order.fulfillment}</Td>
                      <Td className="pr-4">
                        <Badge tone={order.settlement.tone}>{order.settlement.label}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
            <Pagination page={page} pathname={PATH} params={params} noun="orders" />
          </>
        )}
      </Card>
    </div>
  );
}
