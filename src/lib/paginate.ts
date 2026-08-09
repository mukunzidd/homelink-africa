/**
 * Slicing a list into pages, and saying honestly which page you got.
 *
 * Pure and separate from the control that renders it, because the awkward part
 * of pagination is arithmetic rather than markup: an out-of-range page, a page
 * that empties after a filter narrows the list, an off-by-one in "showing 11–20
 * of 20". Each of those is a bug you only see with real numbers, and none of
 * them need a browser to test.
 *
 * A page out of range clamps rather than 404s. Someone arriving on `?page=9`
 * from a bookmark taken when there were nine pages should see the last page of
 * what exists now, not an error about a number they never typed.
 */
export type Page<T> = {
  items: T[];
  /** 1-based, already clamped into range. */
  page: number;
  pages: number;
  total: number;
  /** 1-based inclusive bounds of what is on screen, for "11–20 of 24". */
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * perPage;
  const slice = items.slice(start, start + perPage);

  return {
    items: slice,
    page: current,
    pages,
    total,
    // An empty list is "0–0 of 0" rather than "1–0 of 0".
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    hasPrevious: current > 1,
    hasNext: current < pages,
  };
}

/** Read a `?page=` value without trusting it. */
export function pageParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
