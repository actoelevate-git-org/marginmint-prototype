export const DEFAULT_PAGE_SIZE = 25;

export type Page<T> = {
  rows: T[];
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first row on this page (0 when empty). */
  from: number;
  to: number;
};

export function paginate<T>(rows: T[], requestedPage: number, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return { rows: slice, page, pageCount, total, from: slice.length ? start + 1 : 0, to: start + slice.length };
}

/** Comparator helper: direction-aware, nulls always last. */
export function compareNullable<T>(a: T | null, b: T | null, cmp: (x: T, y: T) => number, dir: "asc" | "desc"): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "asc" ? cmp(a, b) : cmp(b, a);
}
