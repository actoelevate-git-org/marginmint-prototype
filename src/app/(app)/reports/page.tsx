import { ArrowRight, CalendarRange, Download, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { describeRange } from "@/lib/dates";
import { marketplaceFilterLabel } from "@/lib/marketplaces";
import { globalFilterQuery, parseGlobalFilters, type SearchParams } from "@/lib/search-params";
import { buildReport, REPORTS } from "@/services/reports";
import { getCurrentWorkspace } from "@/services/workspace";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const workspace = getCurrentWorkspace();
  const filters = parseGlobalFilters(params, workspace.today);
  const query = globalFilterQuery(filters).toString();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="View any report on screen with a chart, sortable table and totals, or download it as CSV. Every report uses the same ledger and formulas as the dashboard, so totals agree across pages. Use the filters above to change the period and channel."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const rows = buildReport(report.id, filters).rows.length;
          return (
            <Card key={report.id} className="flex flex-col p-4">
              <h2 className="text-sm font-semibold text-ink">{report.title}</h2>
              <p className="mt-1 text-[13px] text-slate-600">{report.description}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{report.metrics}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3.5" aria-hidden="true" />
                  {report.filtered.range ? describeRange(filters.range) : "Current snapshot"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Store className="size-3.5" aria-hidden="true" />
                  {report.filtered.marketplace ? marketplaceFilterLabel(filters.marketplace) : "All marketplaces"}
                </span>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                <span className="num text-xs text-muted">{rows === 0 ? "No rows for this selection" : `${rows} rows`}</span>
                <div className="flex gap-2">
                  <a
                    href={`/api/reports/${report.id}?${query}`}
                    download
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                    aria-label={`Download ${report.title} as CSV`}
                  >
                    <Download aria-hidden="true" />
                    CSV
                  </a>
                  <Link href={`/reports/${report.id}?${query}`} className={buttonVariants({ variant: "default", size: "sm" })} aria-label={`View ${report.title}`}>
                    View report
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
