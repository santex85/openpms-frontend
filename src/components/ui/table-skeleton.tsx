import { cn } from "@/lib/utils";

export function TableSkeletonRow({
  cols,
  className,
}: {
  cols: number;
  className?: string;
}) {
  return (
    <tr className={className}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({
  rows,
  cols,
  className,
}: {
  rows: number;
  cols: number;
  className?: string;
}) {
  return (
    <tbody className={cn("border-b border-border", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <TableSkeletonRow key={r} cols={cols} />
      ))}
    </tbody>
  );
}
