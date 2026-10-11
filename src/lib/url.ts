import type { SearchParams } from "./search-params";

/**
 * Build an href from current search params plus updates. A `null` update removes
 * the key. Pagination resets unless `page` is explicitly updated.
 */
export function hrefWith(pathname: string, current: SearchParams, updates: Record<string, string | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== "") query.set(key, v);
  }
  if (!("page" in updates)) query.delete("page");
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") query.delete(key);
    else query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
