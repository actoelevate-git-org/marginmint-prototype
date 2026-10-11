import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { parseGlobalFilters } from "@/lib/search-params";
import { buildReport, REPORT_IDS, type ReportId } from "@/services/reports";
import { getCurrentWorkspace } from "@/services/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ report: string }> }) {
  const { report } = await context.params;
  if (!(REPORT_IDS as readonly string[]).includes(report)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
  const workspace = getCurrentWorkspace();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseGlobalFilters(params, workspace.today);
  const table = buildReport(report as ReportId, filters);
  const csv = toCsv(table.headers, table.rows);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.filename.replace(/[^\w.\-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
