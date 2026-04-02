import { cn } from "@/lib/utils";

export interface PageTableSkeletonProps {
  /** Number of header + body skeleton rows */
  rows?: number;
  cols?: number;
  className?: string;
}

/** Pulse placeholder for list pages (bookings, guests, audit, …). */
export function PageTableSkeleton({
  rows = 6,
  cols = 5,
  className,
}: PageTableSkeletonProps) {
  const safeRows = Math.max(2, rows);
  const safeCols = Math.max(2, cols);
  return (
    <div
      className={cn("overflow-hidden rounded-md border", className)}
      aria-busy
      aria-label="Загрузка таблицы"
    >
      <div className="min-h-[220px] space-y-0">
        <div className="flex gap-2 border-b bg-muted/40 px-3 py-2">
          {Array.from({ length: safeCols }).map((_, i) => (
            <div
              key={`h-${String(i)}`}
              className="h-4 flex-1 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
        {Array.from({ length: safeRows }).map((_, r) => (
          <div key={`r-${String(r)}`} className="flex gap-2 border-b px-3 py-3">
            {Array.from({ length: safeCols }).map((_, c) => (
              <div
                key={`c-${String(r)}-${String(c)}`}
                className="h-4 flex-1 animate-pulse rounded bg-muted/80"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
