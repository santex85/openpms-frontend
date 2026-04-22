import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  /**
   * When the server does not expose a full count: `true` = enable next;
   * `false` = disable next. When omitted, next is derived from `total`.
   */
  hasMore?: boolean;
  /**
   * When false, only the current page number is shown (e.g. audit log).
   * Default true.
   */
  showTotalCount?: boolean;
  className?: string;
}

/** 1-based page indices for display; inserts ellipsis gaps. */
function buildPageList(current1: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (
    let i = Math.max(1, current1 - 1);
    i <= Math.min(totalPages, current1 + 1);
    i++
  ) {
    pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) {
      out.push("…");
    }
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  hasMore,
  showTotalCount = true,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(offset / safeLimit);
  const current1 = pageIndex + 1;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const canPrev = offset > 0;
  const canNext =
    hasMore === true
      ? true
      : hasMore === false
        ? false
        : offset + safeLimit < total;

  const pageList =
    total > 0 || hasMore === undefined
      ? buildPageList(current1, totalPages)
      : [current1];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {showTotalCount ? (
          <>
            {t("pagination.total", {
              total,
              page: current1,
              pages: totalPages,
            })}
          </>
        ) : (
          <>
            {t("pagination.page", { page: current1 })}
            {totalPages > 1 ? (
              <>
                {" "}
                {t("pagination.of", { pages: totalPages })}
              </>
            ) : null}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => {
            onPageChange(Math.max(0, offset - safeLimit));
          }}
        >
          {t("pagination.prev")}
        </Button>
        {pageList.map((item, i) =>
          item === "…" ? (
            <span
              key={`e-${String(i)}`}
              className="px-1 text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === current1 ? "default" : "outline"}
              size="sm"
              className="min-w-9 px-2"
              disabled={item === current1}
              onClick={() => {
                onPageChange((item - 1) * safeLimit);
              }}
            >
              {item}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => {
            onPageChange(offset + safeLimit);
          }}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}
