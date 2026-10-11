import { PRESET_RANGES, resolveDateRange, type DatePreset, type DateRange, type DayKey } from "@/lib/dates";
import { MARKETPLACE_FILTERS, type MarketplaceFilter } from "@/lib/marketplaces";

/**
 * URL search params are untrusted input. Every reader here validates against an
 * allow-list and falls back to a safe default instead of passing raw strings on.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const raw = first(value);
  return raw !== undefined && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function parseSearchText(value: string | string[] | undefined): string {
  return (first(value) ?? "").trim().slice(0, 80);
}

export function parsePage(value: string | string[] | undefined): number {
  const n = Number.parseInt(first(value) ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

export type SortDirection = "asc" | "desc";

export function parseSort<T extends string>(
  params: SearchParams,
  allowed: readonly T[],
  fallback: { key: T; dir: SortDirection },
): { key: T; dir: SortDirection } {
  const key = parseEnum(params.sort, allowed, fallback.key);
  const dir = parseEnum<SortDirection>(params.dir, ["asc", "desc"], key === fallback.key ? fallback.dir : "desc");
  return { key, dir };
}

export type GlobalFilters = {
  range: DateRange;
  marketplace: MarketplaceFilter;
};

export function parseGlobalFilters(params: SearchParams, today: DayKey): GlobalFilters {
  const preset = parseEnum<DatePreset>(params.range, PRESET_RANGES, "30d");
  return {
    range: resolveDateRange({ preset, today, start: first(params.start), end: first(params.end) }),
    marketplace: parseEnum<MarketplaceFilter>(params.marketplace, MARKETPLACE_FILTERS, "ALL"),
  };
}

/** Query string carrying only the global filters, for links between pages and exports. */
export function globalFilterQuery(filters: GlobalFilters): URLSearchParams {
  const query = new URLSearchParams();
  query.set("range", filters.range.preset);
  if (filters.range.preset === "custom") {
    query.set("start", filters.range.startDay);
    query.set("end", filters.range.endDay);
  }
  if (filters.marketplace !== "ALL") query.set("marketplace", filters.marketplace);
  return query;
}
