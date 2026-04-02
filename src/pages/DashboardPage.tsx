import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatApiError } from "@/lib/formatApiError";
import { cn } from "@/lib/utils";
import { usePropertyStore } from "@/stores/property-store";
import { formatIsoDateLocal } from "@/utils/boardDates";
import { occupancyRatioByDate } from "@/utils/inventoryAggregate";

function shortBookingId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function DashboardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const summary = useDashboardSummary();
  const unpaid = useBookingsUnpaidFolio(selectedPropertyId !== null);

  const chartEnd = useMemo(() => formatIsoDateLocal(new Date()), []);
  const chartStart = useMemo(
    () => formatIsoDateLocal(addDays(new Date(), -6)),
    []
  );
  const chartGrid = useAvailabilityGrid(chartStart, chartEnd);

  const chartDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(formatIsoDateLocal(addDays(new Date(), -6 + i)));
    }
    return days;
  }, []);

  const occupancyByDay = useMemo(
    () => occupancyRatioByDate(chartGrid.data?.cells ?? []),
    [chartGrid.data?.cells]
  );

  if (selectedPropertyId === null) {
    return (
      <div className="space-y-6">
        <PageTitle />
        <p className="text-sm text-muted-foreground">
          Выберите отель в шапке, чтобы загрузить показатели.
        </p>
      </div>
    );
  }

  const currencyCode =
    summary.data !== undefined ? summary.data.currency.trim() : "";

  return (
    <div className="space-y-6">
      <PageTitle />

      {currencyCode !== "" && !summary.isPending && !summary.isError ? (
        <p className="text-xs text-muted-foreground">
          Валюта операций:{" "}
          <span className="font-medium text-foreground">{currencyCode}</span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Заезды сегодня"
          value={
            summary.isPending
              ? "…"
              : summary.isError
                ? "—"
                : String(summary.data!.arrivals_today)
          }
          hint={summary.isError ? formatApiError(summary.error) : null}
        />
        <MetricCard
          label="Выезды сегодня"
          value={
            summary.isPending
              ? "…"
              : summary.isError
                ? "—"
                : String(summary.data!.departures_today)
          }
          hint={summary.isError ? formatApiError(summary.error) : null}
        />
        <Link
          to="/board"
          className={cn(
            "block rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !summary.isError && "hover:bg-muted/20"
          )}
        >
          <MetricCard
            label="Загрузка номеров"
            value={
              summary.isPending
                ? "…"
                : summary.isError
                  ? "—"
                  : `${summary.data!.occupied_rooms} / ${summary.data!.total_rooms}`
            }
            hint={summary.isError ? formatApiError(summary.error) : null}
            footnote="Открыть сетку"
          />
        </Link>
        <MetricCard
          label="Номера «грязные»"
          value={
            summary.isPending
              ? "…"
              : summary.isError
                ? "—"
                : String(summary.data!.dirty_rooms)
          }
          hint={summary.isError ? formatApiError(summary.error) : null}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">
          Загрузка по дням (7 дн.)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Доля занятых номеров по данным доступности (сумма по категориям).
        </p>
        {chartGrid.isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Не удалось построить мини-график.
          </p>
        ) : chartGrid.isPending ? (
          <div className="mt-4 h-16 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="mt-4 flex h-28 items-end gap-1 md:gap-1.5">
            {chartDays.map((iso) => {
              const r = occupancyByDay.get(iso) ?? 0;
              const pct = Math.round(r * 100);
              const hPx = 4 + Math.round(r * 72);
              return (
                <div
                  key={iso}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  title={`${iso}: ${String(pct)}%`}
                >
                  <div
                    className="w-full max-w-[2.5rem] rounded-t bg-primary/80"
                    style={{ height: `${String(hPx)}px` }}
                  />
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {iso.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">
          Неоплаченные фолио
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Брони с положительным балансом.</span>
          <ApiRouteHint>GET /bookings/unpaid-folio-summary</ApiRouteHint>
        </p>
        {unpaid.isError ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Не удалось загрузить балансы фолио.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void unpaid.refetch();
              }}
            >
              Повторить
            </Button>
          </div>
        ) : unpaid.isPending ? (
          <div className="mt-3 h-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (unpaid.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Нет броней с положительным балансом.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Гость</th>
                  <th className="px-3 py-2 font-medium">Бронь</th>
                  <th className="px-3 py-2 font-medium">Баланс</th>
                </tr>
              </thead>
              <tbody>
                {(unpaid.data ?? []).map((row) => (
                  <tr key={row.booking_id} className="border-b border-border/80">
                    <td className="px-3 py-2">{row.guest_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/bookings/${row.booking_id}`}
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                      >
                        {shortBookingId(row.booking_id)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span>Операционные показатели на сегодня.</span>
        <ApiRouteHint className="text-xs">GET /dashboard/summary</ApiRouteHint>
        <span>
          Календарь — на странице{" "}
          <Link
            to="/board"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Сетка
          </Link>
          .
        </span>
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  footnote,
  className = "",
}: {
  label: string;
  value: string;
  hint: string | null;
  footnote?: string;
  className?: string;
}) {
  return (
    <div
      className={`h-full rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {footnote !== undefined ? (
        <p className="mt-1 text-[11px] font-medium text-primary">{footnote}</p>
      ) : null}
      {hint !== null ? (
        <p className="mt-1 text-xs text-destructive">{hint}</p>
      ) : null}
    </div>
  );
}
