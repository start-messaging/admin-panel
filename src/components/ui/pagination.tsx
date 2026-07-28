import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPageList, PAGE_GAP } from "@/lib/page-list";
import type { PaginationMeta } from "@/types";

/** Page sizes offered in the rows-per-page selector. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface PaginationProps {
  pagination: PaginationMeta | null | undefined;
  onPageChange: (page: number) => void;
  /** Omit to hide the rows-per-page selector. */
  onLimitChange?: (limit: number) => void;
  /** Dims the control while a page is being fetched. */
  isLoading?: boolean;
  /** Noun used in the summary line, e.g. "messages". */
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  isLoading = false,
  itemLabel = "results",
  className,
}: PaginationProps) {
  if (!pagination) return null;

  const { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage } =
    pagination;

  // The server returns -1 for both when the client asked it to skip the count.
  const countIsKnown = totalItems >= 0;
  const lastPage = countIsKnown ? Math.max(totalPages, 1) : page;

  // Nothing to page through and no page-size control to offer.
  if (countIsKnown && totalPages <= 1 && !onLimitChange) return null;

  const firstRow = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = countIsKnown
    ? Math.min(page * limit, totalItems)
    : page * limit;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        isLoading && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {countIsKnown ? (
            <>
              Showing <span className="font-medium text-foreground">{firstRow}</span>
              –<span className="font-medium text-foreground">{lastRow}</span> of{" "}
              <span className="font-medium text-foreground">
                {totalItems.toLocaleString("en-IN")}
              </span>{" "}
              {itemLabel}
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">{firstRow}</span>–
              <span className="font-medium text-foreground">{lastRow}</span> {itemLabel}
            </>
          )}
        </p>

        {onLimitChange && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Rows</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {countIsKnown ? (
          <div className="hidden items-center gap-1 sm:flex">
            {buildPageList(page, lastPage).map((entry, index) =>
              entry === PAGE_GAP ? (
                <span
                  key={`gap-${index}`}
                  className="px-1 text-sm text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={entry}
                  variant={entry === page ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(entry)}
                  aria-label={`Page ${entry}`}
                  aria-current={entry === page ? "page" : undefined}
                >
                  {entry}
                </Button>
              ),
            )}
          </div>
        ) : (
          <span className="px-2 text-sm text-muted-foreground">Page {page}</span>
        )}

        <span className="px-1 text-sm text-muted-foreground sm:hidden">
          {countIsKnown ? `${page} / ${lastPage}` : page}
        </span>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        {countIsKnown && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(lastPage)}
            disabled={!hasNextPage}
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
