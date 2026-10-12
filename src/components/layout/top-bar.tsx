import { RefreshCw } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { GlobalFilters } from "./global-filters";
import { MobileNav } from "./mobile-nav";

export function TopBar({
  workspaceName,
  lastSyncedLabel,
  today,
  dataStartDay,
}: {
  workspaceName: string;
  lastSyncedLabel: string;
  today: string;
  dataStartDay: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 print:hidden backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-2.5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">{workspaceName}</span>
              <Tooltip content="This workspace uses simulated, seeded records. No marketplace account is connected and no real sales are shown.">
                <button type="button" className="rounded-[4px]" aria-label="Demo workspace: simulated data">
                  <Badge tone="demo">Demo workspace</Badge>
                </button>
              </Tooltip>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <RefreshCw className="size-3" aria-hidden="true" />
              Demo data as of {lastSyncedLabel}
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="h-9 w-[26rem] max-w-full animate-pulse rounded-md bg-slate-100" />}>
          <GlobalFilters today={today} dataStartDay={dataStartDay} />
        </Suspense>
      </div>
    </header>
  );
}
