import { ArrowLeft, BarChart3, Download, FileSpreadsheet, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfitWaterfall } from "@/components/dashboard/profit-waterfall";
import { RevenueProfitChart } from "@/components/dashboard/revenue-profit-chart";
import { PrintButton } from "@/components/reports/print-button";
import { ReportChart } from "@/components/reports/report-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { SortHeader } from "@/components/ui/sort-header";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { Table, TableContainer, TBody, Td, THead, Tr } from "@/components/ui/table";
import { first, globalFilterQuery, parseEnum, parseGlobalFilters, parsePage, type SearchParams, type SortDirection } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";
import { getReportView } from "@/services/report-views";
import { REPORT_IDS, REPORTS, type ReportId } from "@/services/reports";
import { getCurrentWorkspace } from "@/services/workspace";

type Props = { params: Promise<{ report: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { report: reportId } = await params;
  const report = REPORTS.find((r) => r.id === reportId);
  return { title: report ? report.title : "Report" };
}

function parseColumn(value: string | string[] | undefined): number | null {
  const raw = first(value);
  if (!raw || !/^\d{1,2}$/.test(raw)) return null;
  return Number(raw);
}

export default async function ReportViewPage({ params, searchParams }: Props) {
  const { report } = await params;
  if (!(REPORT_IDS as readonly string[]).includes(report)) notFound();
  const id = report as ReportId;
  const query = await searchParams;
  const filters = parseGlobalFilters(query, getCurrentWorkspace().today);
  const column = parseColumn(query.sort);
  const dir = parseEnum<SortDirection>(query.dir, ["asc", "desc"], "desc");
  const view = getReportView(id, { filters, sort: column === null ? null : { column, dir }, page: parsePage(query.page) });
  const path = `/reports/${id}`;
  const backHref = `/reports?${globalFilterQuery(filters).toString()}`;

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-ink print:hidden">
        <ArrowLeft className="size-4" aria-hidden="true" /> All reports
      </Link>
      <PageHeader
        title={view.definition.title}
        description={
          <>
            {view.definition.description} <span className="font-medium text-slate-700">{view.scopeLabel}</span>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={view.csvHref} download className={buttonVariants({ variant: "default" })}>
              <Download aria-hidden="true" />
              Download CSV
            </a>
            <PrintButton />
          </div>
        }
      />

      <Notice title="How it's calculated:">{view.definition.metrics}</Notice>
      {view.rangeNote ? (
        <p className="flex items-center gap-1.5 text-xs text-muted print:hidden">
          <Info className="size-3.5" aria-hidden="true" />
          {view.rangeNote}
        </p>
      ) : null}

      {view.tiles.length ? (
        <StatGrid className="xl:grid-cols-4">
          {view.tiles.map((tile) => (
            <StatTile key={tile.label} label={tile.label} value={tile.value} hint={tile.hint} tone={tile.tone} />
          ))}
        </StatGrid>
      ) : null}

      {view.pnl ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3 print:break-inside-avoid">
            <CardHeader title="Revenue vs profit" description="Net sales, gross profit and net profit over the period." />
            <RevenueProfitChart daily={view.pnl.trend.daily} weekly={view.pnl.trend.weekly} />
          </Card>
          <Card className="xl:col-span-2 print:break-inside-avoid">
            <CardHeader title="Where the money goes" description="From net sales to net profit." />
            <CardContent className="pt-2">
              {"steps" in view.pnl.waterfall ? (
                <ProfitWaterfall steps={view.pnl.waterfall.steps} />
              ) : (
                <EmptyState title="Breakdown unavailable" description={view.pnl.waterfall.unavailable} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : view.chart ? (
        <Card className="print:break-inside-avoid">
          <CardHeader title={view.chart.title} description={view.chart.description} />
          <CardContent>
            <ReportChart chart={view.chart} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Report data"
          description={
            view.rowCount === 0
              ? "No rows for this selection."
              : `${view.rowCount.toLocaleString("en-IN")} row${view.rowCount === 1 ? "" : "s"} · same data as the CSV download${view.totals ? " · totals cover every row, not only this page" : ""}`
          }
          titleAddon={<FileSpreadsheet className="size-4 text-muted" aria-hidden="true" />}
        />
        {view.rowCount === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nothing to report for this selection"
            description="There are no records for this period and marketplace. Try a wider date range or All marketplaces."
          />
        ) : (
          <>
            <TableContainer className="mt-3">
              <Table className="min-w-[720px]">
                <THead>
                  <tr>
                    {view.columns.map((col, i) => (
                      <SortHeader
                        key={col.header}
                        label={col.header}
                        sortKey={String(i)}
                        current={{ key: String(view.sort.column), dir: view.sort.dir }}
                        pathname={path}
                        params={query}
                        align={col.numeric ? "right" : "left"}
                      />
                    ))}
                  </tr>
                </THead>
                <TBody>
                  {view.rows.map((row, r) => (
                    <Tr key={`${view.page}-${r}`}>
                      {row.map((cell, i) => {
                        const col = view.columns[i];
                        return (
                          <Td
                            key={i}
                            align={col?.numeric ? "right" : "left"}
                            className={cn(
                              col?.type === "id" && "font-mono text-xs",
                              col?.type === "text" && i > 0 && "min-w-[200px] max-w-[320px] whitespace-normal",
                              cell.negative && (col?.numeric || id === "pnl") && "text-loss-text",
                            )}
                          >
                            {cell.text}
                          </Td>
                        );
                      })}
                    </Tr>
                  ))}
                  {view.totals ? (
                    <Tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold hover:bg-slate-50">
                      {view.totals.map((total, i) => (
                        <Td key={i} align={view.columns[i]?.numeric ? "right" : "left"} className={cn(total?.startsWith("−") && "text-loss-text")}>
                          {total ?? ""}
                        </Td>
                      ))}
                    </Tr>
                  ) : null}
                </TBody>
              </Table>
            </TableContainer>
            {view.pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted print:hidden">
                <span className="num">
                  Page {view.page} of {view.pageCount}
                </span>
                <div className="flex gap-2">
                  {view.page > 1 ? (
                    <Link href={hrefWith(path, query, { page: String(view.page - 1) })} scroll={false} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Previous
                    </Link>
                  ) : null}
                  {view.page < view.pageCount ? (
                    <Link href={hrefWith(path, query, { page: String(view.page + 1) })} scroll={false} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
