import { Download, Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { SearchForm } from "@/components/ui/search-form";
import { SortHeader } from "@/components/ui/sort-header";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseGlobalFilters, parseSearchText, parseSort, type SearchParams } from "@/lib/search-params";
import { AD_SORT_KEYS, getAdvertisingView } from "@/services/advertising";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Advertising" };
const PATH = "/advertising";

export default async function AdvertisingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const q = parseSearchText(params.q);
  const sort = parseSort(params, AD_SORT_KEYS, { key: "spend", dir: "desc" });
  const view = getAdvertisingView({ filters, q, sort });
  const s = view.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Advertising"
        description={`${marketplaceFilterLabel(filters.marketplace)} · ${describeRange(filters.range)}. Seeded sponsored-product data; no ad platform is connected.`}
        actions={
          <a href={`/api/reports/advertising?${globalFilterQuery(filters).toString()}`} className={buttonVariants({ variant: "secondary" })} download>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        }
      />
      <StatGrid>
        <StatTile label="Ad spend" value={s.spend} />
        <StatTile label="Attributed sales" value={s.attributedSales} tooltip="Sales the ad platform credits to a click within its attribution window. Not necessarily incremental." />
        <StatTile label="ROAS" value={s.roas} tooltip="Return on ad spend = attributed sales ÷ ad spend. Shown as — when spend is zero." />
        <StatTile label="ACOS" value={s.acos} tooltip="Advertising cost of sales = ad spend ÷ attributed sales × 100. Shown as — when attributed sales are zero." />
        <StatTile label="Clicks" value={s.clicks} />
        <StatTile label="Attributed orders" value={s.orders} />
      </StatGrid>
      <Notice>
        Attributed sales are not necessarily incremental, and attribution windows differ between Amazon and Flipkart. Judge campaigns by
        product net profit after advertising on Profit Analytics, not ROAS alone. Advertising CSV import arrives in a later phase.
      </Notice>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Campaigns</h2>
          <SearchForm pathname={PATH} params={params} label="Search campaigns" placeholder="Campaign or SKU" />
        </div>
        {view.rows.length === 0 ? (
          <EmptyState icon={Megaphone} title="No advertising data" description="No campaign activity matches this period, marketplace or search." />
        ) : (
          <TableContainer>
            <Table className="min-w-[1000px]">
              <THead>
                <tr>
                  <Th className="pl-4">Campaign</Th>
                  <Th>Marketplace</Th>
                  <SortHeader label="Spend" sortKey="spend" current={sort} pathname={PATH} params={params} align="right" />
                  <SortHeader label="Attributed sales" sortKey="sales" current={sort} pathname={PATH} params={params} align="right" />
                  <Th align="right">Orders</Th>
                  <Th align="right">Clicks</Th>
                  <Th align="right">Impressions</Th>
                  <SortHeader label="ROAS" sortKey="roas" current={sort} pathname={PATH} params={params} align="right" />
                  <SortHeader label="ACOS" sortKey="acos" current={sort} pathname={PATH} params={params} align="right" />
                </tr>
              </THead>
              <TBody>
                {view.rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="pl-4">
                      <div className="font-medium">{r.campaign}</div>
                      <div className="flex items-center gap-1.5 font-mono text-2xs text-muted">
                        {r.sku}
                        {r.unprofitable ? <Badge tone="negative">Spend exceeds attributed sales</Badge> : null}
                      </div>
                    </Td>
                    <Td>{r.marketplace}</Td>
                    <Td align="right">{r.spend}</Td>
                    <Td align="right">{r.attributedSales}</Td>
                    <Td align="right">{r.orders}</Td>
                    <Td align="right">{r.clicks}</Td>
                    <Td align="right" className="text-slate-600">
                      {r.impressions}
                    </Td>
                    <Td align="right" className="font-medium">
                      {r.roas}
                    </Td>
                    <Td align="right" className="pr-4">
                      {r.acos}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </div>
  );
}
