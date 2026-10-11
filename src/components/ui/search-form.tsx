import { Search } from "lucide-react";
import type { SearchParams } from "@/lib/search-params";

/**
 * GET search form. Preserves every other active param as hidden inputs, so global
 * filters and sorting survive a search, and resets pagination.
 */
export function SearchForm({
  pathname,
  params,
  placeholder,
  label,
  name = "q",
}: {
  pathname: string;
  params: SearchParams;
  placeholder: string;
  label: string;
  name?: string;
}) {
  const current = typeof params[name] === "string" ? (params[name] as string) : "";
  const hidden = Object.entries(params).filter(([key, value]) => key !== name && key !== "page" && typeof value === "string" && value !== "");
  return (
    <form action={pathname} method="get" role="search" className="relative w-full sm:w-72">
      {hidden.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value as string} />
      ))}
      <label htmlFor={`search-${name}`} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id={`search-${name}`}
        type="search"
        name={name}
        defaultValue={current}
        placeholder={placeholder}
        maxLength={80}
        className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-3 text-sm shadow-card placeholder:text-slate-400 focus-visible:border-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/25"
      />
    </form>
  );
}
