import { DatabaseZap, PackageSearch, Plug } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { IntegrationResultNotice } from "@/components/integrations/result-notice";
import { PendingForm } from "@/components/integrations/pending-form";
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
import { InfoTooltip } from "@/components/ui/tooltip";
import { ORDER_STATUSES, type OrderStatus } from "@/data/demo/types";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { parseEnum, parseGlobalFilters, parsePage, parseSearchText, parseSort, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import type { ConnectedProvider } from "@/services/integrations/connected";
import { listSyncedOrders } from "@/services/integrations/synced-orders";
import { ORDER_SORT_KEYS, ORDER_STATUS_LABEL } from "@/services/orders";
import { getCurrentWorkspace } from "@/services/workspace";

const PATH = "/orders";
const NAME = { amazon: "Amazon", flipkart: "Flipkart" } as const;

export async function SyncedOrdersView({
  params,
  sourceTabs,
  connected,
}: {
  params: SearchParams;
  sourceTabs: ReactNode;
  connected: ConnectedProvider[];
}) {
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const status = parseEnum<OrderStatus | "ALL">(params.status, ["ALL", ...ORDER_STATUSES], "ALL");
  const q = parseSearchText(params.q);
  const sort = parseSort(params, ORDER_SORT_KEYS, { key: "date", dir: "desc" });
  const result = await listSyncedOrders({ ...filters, status, q, sort, page: parsePage(params.page) });
  const syncable = connected.filter((c) => !c.reauthRequired);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description={`Synced from marketplaces · ${marketplaceFilterLabel(filters.marketplace)} · ${describeRange(filters.range)}. Buyer details are not imported.`}
        actions={
          <>
            {syncable.map((c) => (
              <PendingForm
                key={c.id}
                action={`/api/integrations/${c.id}/sync`}
                label={`Sync ${NAME[c.id]}`}
                pendingLabel={`Syncing ${NAME[c.id]}…`}
                hidden={{ returnTo: "/orders" }}
              />
            ))}
            <Link href="/integrations" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Plug aria-hidden="true" />
              Manage connections
            </Link>
          </>
        }
      />
      {sourceTabs}
      <IntegrationResultNotice params={params} />

      {result.kind === "unavailable" ? (
        <Card>
          <EmptyState
            icon={DatabaseZap}
            title={result.reason === "no_database" ? "Synced orders need a database" : "Synced orders could not be loaded"}
            description={
              result.reason === "no_database"
                ? "Set DATABASE_URL and connect Amazon or Flipkart on the Integrations page. Demo data is still available."
                : "The database did not respond. Nothing was lost; try again in a moment."
            }
            action={
              <Link href="/integrations" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Go to Integrations
              </Link>
            }
          />
        </Card>
      ) : result.providers.length === 0 ? (
        <Card>
          <EmptyState
            icon={Plug}
            title={`${marketplaceFilterLabel(filters.marketplace)} does not sync yet`}
            description="Only Amazon and Flipkart orders can be synced today. Choose “All marketplaces”, Amazon or Flipkart in the filter above."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <TabLinks
              label="Order status"
              items={(["ALL", ...ORDER_STATUSES] as const).map((s) => ({
                label: s === "ALL" ? "All" : ORDER_STATUS_LABEL[s],
                href: hrefWith(PATH, params, { status: s === "ALL" ? null : s }),
                active: status === s,
                count: result.statusCounts[s] ?? 0,
              }))}
            />
            <SearchForm pathname={PATH} params={params} label="Search synced orders" placeholder="Marketplace order ID or exact SKU" />
          </div>
          {result.page.total === 0 ? (
            connected.length === 0 ? (
              <EmptyState
                icon={Plug}
                title="No marketplace connected"
                description="Connect Amazon or Flipkart to import your orders. Until then, switch to Demo data to explore MarginMint."
                action={
                  <Link href="/integrations" className={buttonVariants({ size: "sm" })}>
                    Connect a marketplace
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={PackageSearch}
                title="No synced orders match"
                description={q || status !== "ALL" ? "Clear the search or status filter, or widen the date range." : "No orders in this date range yet. Run a sync or widen the date range."}
                action={
                  q || status !== "ALL" ? (
                    <Link href={hrefWith(PATH, params, { q: null, status: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Clear search and status
                    </Link>
                  ) : undefined
                }
              />
            )
          ) : (
            <>
              <TableContainer>
                <Table className="min-w-[960px]">
                  <THead>
                    <tr>
                      <Th className="pl-4">Marketplace order ID</Th>
                      <SortHeader label="Order date" sortKey="date" current={sort} pathname={PATH} params={params} />
                      <Th>Marketplace</Th>
                      <SortHeader label="Units" sortKey="units" current={sort} pathname={PATH} params={params} align="right" />
                      <SortHeader label="Item value" sortKey="value" current={sort} pathname={PATH} params={params} align="right" />
                      <Th>
                        <span className="inline-flex items-center gap-1">
                          Status
                          <InfoTooltip
                            label="Status"
                            content="MarginMint status mapped from the marketplace. The marketplace's own status is shown underneath."
                          />
                        </span>
                      </Th>
                      <Th>Fulfilled by</Th>
                      <Th className="pr-4">Last synced</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {result.page.rows.map((order) => (
                      <Tr key={`${order.provider}-${order.id}`}>
                        <Td className="pl-4 font-mono text-xs">{order.id}</Td>
                        <Td className="text-slate-600">{order.date}</Td>
                        <Td>
                          <Badge tone="info">{order.marketplace}</Badge>
                        </Td>
                        <Td align="right">
                          {order.units}
                          {order.items > 1 ? <span className="ml-1 text-2xs text-muted">({order.items} items)</span> : null}
                        </Td>
                        <Td align="right" className="font-medium" title={order.valueNote ?? undefined}>
                          {order.value}
                          {order.valueNote ? <div className="text-2xs font-normal text-muted">{order.valueNote}</div> : null}
                        </Td>
                        <Td>
                          <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
                          <div className="mt-0.5 font-mono text-2xs text-muted">{order.providerStatus}</div>
                        </Td>
                        <Td className="text-slate-600">{order.fulfilledBy ?? "—"}</Td>
                        <Td className="pr-4 text-xs text-slate-600">{order.lastSynced}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
              <Pagination page={result.page} pathname={PATH} params={params} noun="synced orders" />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
