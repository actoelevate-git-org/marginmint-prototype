import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import type { SearchParams, SortDirection } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/utils";
import { Th } from "./table";

/** Sortable column header. Sorting is URL state handled by the server. */
export function SortHeader({
  label,
  sortKey,
  current,
  pathname,
  params,
  align = "left",
}: {
  label: string;
  sortKey: string;
  current: { key: string; dir: SortDirection };
  pathname: string;
  params: SearchParams;
  align?: "left" | "right";
}) {
  const active = current.key === sortKey;
  const nextDir: SortDirection = active && current.dir === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : current.dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <Th align={align} aria-sort={active ? (current.dir === "desc" ? "descending" : "ascending") : "none"}>
      <Link
        href={hrefWith(pathname, params, { sort: sortKey, dir: nextDir })}
        className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink", align === "right" && "flex-row-reverse")}
        scroll={false}
      >
        {label}
        <Icon className={cn("size-3", !active && "text-slate-300")} aria-hidden="true" />
        <span className="sr-only">, sort {nextDir === "desc" ? "descending" : "ascending"}</span>
      </Link>
    </Th>
  );
}
