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

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  hasMore,
  showTotalCount = true,
  className,
}: PaginationProps) {
  const safeLimit = Math.max(1, limit);
  const pageIndex = Math.floor(offset / safeLimit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const canPrev = offset > 0;
  const canNext =
    hasMore === true
      ? true
      : hasMore === false
        ? false
        : offset + safeLimit < total;

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
            Всего: {total}. Стр. {pageIndex + 1} из {totalPages}.
          </>
        ) : (
          <>Стр. {pageIndex + 1}</>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => {
            onPageChange(Math.max(0, offset - safeLimit));
          }}
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => {
            onPageChange(offset + safeLimit);
          }}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
