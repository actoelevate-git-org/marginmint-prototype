import { Boxes, Download } from "lucide-react";
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
import { InfoTooltip } from "@/components/ui/tooltip";
import { parseEnum, parsePage, parseSearchText, parseSort, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getInventoryView, INVENTORY_SORT_KEYS, INVENTORY_VIEWS, type InventoryView } from "@/services/inventory";

export const metadata: Metadata = { title: "Products & Inventory" };
const PATH = "/products";
const STATUS_LABEL = { out: "Out of stock", low: "Low stock", healthy: "Healthy" } as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = parseEnum<InventoryView>(params.view, INVENTORY_VIEWS, "all");
  const q = parseSearchText(params.q);
  const sort = parseSort(params, INVENTORY_SORT_KEYS, { key: "cover", dir: "asc" });
  const data = getInventoryView({ view, q, sort, page: parsePage(params.page) });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & Inventory"
        description="Stock is shared across channels. Available = on hand − reserved. Inventory value = available × unit cost."
        actions={
          <a href="/api/reports/inventory-valuation" className={buttonVariants({ variant: "secondary" })} download>
            <Download aria-hidden="true" />
            Export valuation (CSV)
          </a>
        }
      />
      <StatGrid className="xl:grid-cols-4">
        <StatTile label="Inventory value" value={data.summary.value} hint={`${data.summary.units} sellable units`} tooltip="Available units × unit cost across all SKUs. Snapshot as of the last sync." />
        <StatTile label="Active SKUs" value={data.summary.skus} />
        <StatTile label="Low stock" value={data.summary.low} tone={data.summary.low > 0 ? "warning" : "default"} hint="At or below reorder point" />
        <StatTile label="Out of stock" value={data.summary.out} tone={data.summary.out > 0 ? "negative" : "default"} hint="No sellable units" />
      </StatGrid>

      <Notice>
        Product editing, stock adjustments and CSV import need the database layer and arrive in the next phase. This view is read-only
        and calculated from the demo records. {data.velocityNote}
      </Notice>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <TabLinks
            label="Inventory view"
            items={[
              { label: "All products", href: hrefWith(PATH, params, { view: null }), active: view === "all" },
              { label: "Needs restock", href: hrefWith(PATH, params, { view: "low" }), active: view === "low", count: data.summary.low + data.summary.out },
            ]}
          />
          <SearchForm pathname={PATH} params={params} label="Search products" placeholder="Product name or SKU" />
        </div>
        {data.page.total === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products match"
            description={q ? `Nothing matches “${q}”.` : "Every product is above its reorder point."}
            action={
              <Link href={PATH} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Show all products
              </Link>
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table className="min-w-[1240px]">
                <THead>
                  <tr>
                    <SortHeader label="Product" sortKey="name" current={sort} pathname={PATH} params={params} />
                    <Th>Channels</Th>
                    <Th align="right">Price</Th>
                    <Th align="right">Unit cost</Th>
                    <Th align="right">On hand</Th>
                    <Th align="right">Reserved</Th>
                    <SortHeader label="Available" sortKey="available" current={sort} pathname={PATH} params={params} align="right" />
                    <SortHeader label="Value" sortKey="value" current={sort} pathname={PATH} params={params} align="right" />
                    <Th align="right">
                      <span className="inline-flex items-center gap-1">
                        Est. unit contribution
                        <InfoTooltip
                          label="Estimated unit contribution"
                          content="Selling price − unit cost − channel commission and fees − shipping, on the product's least profitable channel. Before advertising and returns, so it is an estimate, not realised profit."
                        />
                      </span>
                    </Th>
                    <SortHeader label="Days of cover" sortKey="cover" current={sort} pathname={PATH} params={params} align="right" />
                    <Th className="pr-4">Status</Th>
                  </tr>
                </THead>
                <TBody>
                  {data.page.rows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="pl-3">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-2xs text-muted">
                          <span className="font-mono">{row.sku}</span> · {row.category}
                        </div>
                      </Td>
                      <Td className="text-slate-600">{row.channels}</Td>
                      <Td align="right">{row.sellingPrice}</Td>
                      <Td align="right">{row.unitCost}</Td>
                      <Td align="right">{row.onHand}</Td>
                      <Td align="right" className="text-slate-600">
                        {row.reserved}
                      </Td>
                      <Td align="right" className="font-medium">
                        {row.available}
                        <div className="text-2xs font-normal text-muted">reorder at {row.reorderThreshold}</div>
                      </Td>
                      <Td align="right">{row.inventoryValue}</Td>
                      <Td align="right">
                        <span className={cn(row.unitContributionNegative && "text-loss-text")}>{row.unitContribution}</span>
                        <div className="text-2xs text-muted">{row.unitContributionNote}</div>
                      </Td>
                      <Td align="right">
                        {row.cover}
                        <div className="text-2xs text-muted">{row.coverNote}</div>
                      </Td>
                      <Td className="pr-4">
                        <StatusBadge status={row.status} label={STATUS_LABEL[row.status]} />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
            <Pagination page={data.page} pathname={PATH} params={params} noun="products" />
          </>
        )}
      </Card>
    </div>
  );
}
