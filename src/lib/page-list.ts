/** Marker for a skipped run of page numbers, rendered as an ellipsis. */
export const PAGE_GAP = "gap" as const;

export type PageListEntry = number | typeof PAGE_GAP;

/** How many page slots the strip shows before it starts collapsing runs. */
const MAX_SHOWN = 7;

/**
 * Builds the page-number strip for a pager.
 *
 * Always includes the first and last page plus a window around the current
 * one, with a gap marker wherever a run is skipped. Near the ends the window
 * is extended inward so the strip keeps a roughly stable width instead of
 * shrinking — a control that changes size as you page through it makes the
 * next button move out from under the cursor.
 */
export function buildPageList(current: number, total: number): PageListEntry[] {
  if (!Number.isFinite(total) || total < 1) return [];

  const clamped = Math.min(Math.max(current, 1), total);

  if (total <= MAX_SHOWN) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, clamped]);
  if (clamped - 1 > 1) pages.add(clamped - 1);
  if (clamped + 1 < total) pages.add(clamped + 1);

  // Extend inward at the ends, where the window is clipped by the boundary.
  if (clamped <= 3) [2, 3, 4].forEach((p) => p < total && pages.add(p));
  if (clamped >= total - 2) {
    [total - 1, total - 2, total - 3].forEach((p) => p > 1 && pages.add(p));
  }

  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const withGaps: PageListEntry[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) withGaps.push(PAGE_GAP);
    withGaps.push(page);
    previous = page;
  }
  return withGaps;
}
