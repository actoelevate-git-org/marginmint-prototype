import { BarChart3, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchForm } from "@/components/ui/search-form";
import { TabLinks } from "@/components/ui/tab-links";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { InfoTooltip } from "@/components/ui/tooltip";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseEnum, parseGlobalFilters, parseSearchText, type SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getProfitabilityView, PROFIT_SORT_LABEL, PROFIT_SORTS, type ProfitSort } from "@/services/profitability";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Profit Analytics" };
const PATH = "/profitability";

const COLUMNS: { key: "grossSales" | "discounts" | "netSales" | "cogs" | "fees" | "shipping" | "advertising" | "returns"; label: string; tip?: string }[] = [
  { key: "grossSales", label: "Gross sales" },
  { key: "discounts", label: "Discounts & cancels", tip: "Discounts on kept lines plus the value of cancelled lines." },
  { key: "netSales", label: "Net sales" },
  { key: "cogs", label: "COGS", tip: "Cost of goods sold: unit cost × units sold." },
  { key: "fees", label: "Fees", tip: "Marketplace commission, closing fees and payment-gateway fees." },
  { key: "shipping", label: "Shipping" },
  { key: "advertising", label: "Ads", tip: "Spend on campaigns attributed to this SKU." },
  { key: "returns", label: "Return losses", tip: "Refunds + return shipping − cost of stock recovered." },
];

export default async function ProfitabilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const sort = parseEnum<ProfitSort>(params.sort, PROFIT_SORTS, "profit-desc");
  const q = parseSearchText(params.q);
  const view = getProfitabilityView({ filters, q, sort });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profit Analytics"
        description={`Product-level profit for ${marketplaceFilterLabel(filters.marketplace).toLowerCase()} · ${describeRange(filters.range)}. Same ledger and formulas as the overview.`}
        actions={
          <a
            href={`/api/reports/product-profitability?${globalFilterQuery(filters).toString()}`}
            className={buttonVariants({ variant: "secondary" })}
            download
          >
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <TabLinks
            label="Sort products"
            items={PROFIT_SORTS.map((s) => ({ label: PROFIT_SORT_LABEL[s], href: hrefWith(PATH, params, { sort: s === "profit-desc" ? null : s }), active: sort === s }))}
          />
          <SearchForm pathname={PATH} params={params} label="Search products" placeholder="Product name or SKU" />
        </div>
        {view.rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title={sort === "losses" ? "No loss-making products" : "No products match"}
            description={sort === "losses" ? "Every product with sales made a profit in this period." : `Nothing matches “${q}”.`}
            action={
              <Link href={hrefWith(PATH, params, { q: null, sort: null })} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Show all products
              </Link>
            }
          />
        ) : (
          <TableContainer>
            <Table className="min-w-[1360px]">
              <THead>
                <tr>
                  <Th className="pl-4">Product</Th>
                  <Th align="right">Units</Th>
                  {COLUMNS.map((c) => (
                    <Th key={c.key} align="right">
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {c.tip ? <InfoTooltip label={c.label} content={c.tip} /> : null}
                      </span>
                    </Th>
                  ))}
                  <Th align="right">Net profit</Th>
                  <Th align="right">Margin</Th>
                  <Th align="right" className="pr-4">
                    Per unit
                  </Th>
                </tr>
              </THead>
              <TBody>
                {view.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="pl-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="flex items-center gap-1.5 text-2xs text-muted">
                        <span className="font-mono">{row.sku}</span>
                        {row.coverage === "no-sales" ? <Badge>No sales</Badge> : null}
                        {row.coverage === "incomplete" ? <Badge tone="warning">Cost missing</Badge> : null}
                      </div>
                    </Td>
                    <Td align="right">{row.unitsSold}</Td>
                    {COLUMNS.map((c) => (
                      <Td key={c.key} align="right" className={c.key === "netSales" ? "font-medium" : "text-slate-600"}>
                        {row[c.key]}
                      </Td>
                    ))}
                    <Td align="right" className={cn("font-semibold", row.netProfitNegative && "text-loss-text")}>
                      {row.netProfit}
                    </Td>
                    <Td align="right" className={cn(row.netProfitNegative && "text-loss-text")}>
                      {row.margin}
                    </Td>
                    <Td align="right" className="pr-4">
                      {row.profitPerUnit}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        )}
        <CardFooter className="num">
          Reconciliation: sum of product net profit {view.reconciliation.productTotal} + expenses not allocated to products{" "}
          {view.reconciliation.unallocated} = workspace net profit {view.reconciliation.workspaceTotal}. Figures are management-accounting
          estimates, not audited profit.
        </CardFooter>
      </Card>
    </div>
  );
}
