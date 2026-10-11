import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Page } from "@/lib/pagination";
import type { SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";

export function Pagination({ page, pathname, params, noun }: { page: Page<unknown>; pathname: string; params: SearchParams; noun: string }) {
  const prev = page.page > 1 ? hrefWith(pathname, params, { page: String(page.page - 1) }) : null;
  const next = page.page < page.pageCount ? hrefWith(pathname, params, { page: String(page.page + 1) }) : null;
  const button = "inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[13px] font-medium shadow-card";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted">
      <p className="num">
        {page.total === 0 ? `No ${noun}` : `Showing ${page.from}–${page.to} of ${page.total.toLocaleString("en-IN")} ${noun}`}
      </p>
      {page.pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {prev ? (
            <Link href={prev} className={cn(button, "hover:bg-slate-50")} scroll={false}>
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </Link>
          ) : (
            <span className={cn(button, "cursor-not-allowed opacity-50")} aria-disabled="true">
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </span>
          )}
          <span className="num px-1">
            Page {page.page} of {page.pageCount}
          </span>
          {next ? (
            <Link href={next} className={cn(button, "hover:bg-slate-50")} scroll={false}>
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(button, "cursor-not-allowed opacity-50")} aria-disabled="true">
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
