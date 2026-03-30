import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";
import { formatIsoDateLocal } from "@/utils/boardDates";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function DashboardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  const { startIso, endIso } = useMemo(() => {
    const end = new Date();
    const start = addDays(end, -30);
    return {
      startIso: formatIsoDateLocal(start),
      endIso: formatIsoDateLocal(end),
    };
  }, []);

  const { data, isPending, isError, error } = useDashboardSummary(
    startIso,
    endIso
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Метрики по выбранному отелю за последние 30 дней (
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /dashboard/summary
          </code>
          ). Календарь и остатки — на странице{" "}
          <Link
            to="/board"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Сетка
          </Link>
          .
        </p>
      </div>

      {selectedPropertyId === null ? (
        <p className="text-sm text-muted-foreground">
          Выберите отель в шапке, чтобы загрузить показатели.
        </p>
      ) : isError ? (
        <p className="text-sm text-destructive" role="alert">
          {error !== null
            ? formatApiError(error)
            : "Не удалось загрузить сводку."}
        </p>
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-card"
              aria-hidden
            />
          ))}
        </div>
      ) : data === undefined ? null : (
        <>
          <p className="text-xs text-muted-foreground">
            Период: {data.period_start} — {data.period_end}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Активные брони"
              value={String(data.active_bookings)}
            />
            <MetricCard
              label="Заезды сегодня"
              value={String(data.arrivals_today)}
            />
            <MetricCard
              label="Выезды сегодня"
              value={String(data.departures_today)}
            />
            <MetricCard
              label="Занято номеров"
              value={`${data.occupied_rooms} / ${data.total_rooms}`}
            />
            <MetricCard
              label="Выручка за период"
              value={`${data.revenue_total} ${data.currency}`}
              className="sm:col-span-2"
            />
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
