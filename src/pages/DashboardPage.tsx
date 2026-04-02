import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useProperties } from "@/hooks/useProperties";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";
import type { AvailabilityCell } from "@/types/inventory";
import { formatIsoDateLocal } from "@/utils/boardDates";

function shortBookingId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function occupancyPercentByDate(cells: AvailabilityCell[]): Map<string, number> {
  const agg = new Map<string, { booked: number; total: number }>();
  for (const c of cells) {
    const d = c.date.slice(0, 10);
    const cur = agg.get(d) ?? { booked: 0, total: 0 };
    cur.booked += c.booked_rooms;
    cur.total += c.total_rooms;
    agg.set(d, cur);
  }
  const out = new Map<string, number>();
  for (const [d, v] of agg) {
    out.set(d, v.total > 0 ? Math.round((100 * v.booked) / v.total) : 0);
  }
  return out;
}

export function DashboardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const summary = useDashboardSummary();
  const unpaid = useBookingsUnpaidFolio(selectedPropertyId !== null);
  const { data: properties } = useProperties();

  const weekRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return {
      startIso: formatIsoDateLocal(start),
      endIso: formatIsoDateLocal(end),
      days: (() => {
        const d: { iso: string; dd: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const x = new Date(start);
          x.setDate(x.getDate() + i);
          d.push({
            iso: formatIsoDateLocal(x),
            dd: x.getDate(),
          });
        }
        return d;
      })(),
    };
  }, []);

  const availWeek = useAvailabilityGrid(weekRange.startIso, weekRange.endIso);

  const weekOccupancy = useMemo(() => {
    if (availWeek.data?.cells === undefined) {
      return null;
    }
    return occupancyPercentByDate(availWeek.data.cells);
  }, [availWeek.data?.cells]);

  const propertyCurrency = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return null;
    }
    return properties.find((p) => p.id === selectedPropertyId)?.currency ?? null;
  }, [selectedPropertyId, properties]);

  const summaryCurrency =
    summary.data?.currency ?? propertyCurrency ?? null;

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

  return (
    <div className="space-y-6">
      <PageTitle />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/board"
          className="block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MetricCard
            label="Загрузка номеров"
            value={
              summary.isPending
                ? "…"
                : summary.isError
                  ? "—"
                  : `${summary.data!.occupied_rooms} / ${summary.data!.total_rooms}${summaryCurrency !== null ? ` · ${summaryCurrency}` : ""}`
            }
            hint={summary.isError ? formatApiError(summary.error) : null}
            subHint="Перейти к сетке"
          />
        </Link>
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
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Загрузка за 7 дней
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Доля занятых номер-ночей по данным инвентаря.
        </p>
        {availWeek.isError ? (
          <p className="mt-2 text-sm text-destructive">
            {availWeek.error !== null
              ? formatApiError(availWeek.error)
              : "Ошибка"}
          </p>
        ) : availWeek.isPending || weekOccupancy === null ? (
          <div className="mt-3 h-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="mt-3 flex h-28 items-end gap-1 border-b border-border pb-1">
            {weekRange.days.map((day) => {
              const pct = weekOccupancy.get(day.iso) ?? 0;
              return (
                <div
                  key={day.iso}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  title={`${day.iso}: ${String(pct)}%`}
                >
                  <div
                    className="w-full max-w-[2.5rem] rounded-t bg-primary/80"
                    style={{ height: `${Math.max(8, pct)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {day.dd}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Неоплаченные фолио
        </h3>
        <ApiRouteHint className="mt-1">
          <p>
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              GET /bookings/unpaid-folio-summary
            </code>
          </p>
        </ApiRouteHint>
        {unpaid.isError ? (
          <div
            className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Не удалось загрузить балансы фолио.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-destructive/50"
              onClick={() => void unpaid.refetch()}
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
                    <td className="px-3 py-2 tabular-nums">
                      {row.balance}
                      {summaryCurrency !== null ? ` ${summaryCurrency}` : ""}
                    </td>
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
      <p className="mt-1 text-sm text-muted-foreground">
        Операционные показатели на сегодня. Календарь — на странице{" "}
        <Link
          to="/board"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Сетка
        </Link>
        .
      </p>
      <ApiRouteHint className="mt-1">
        <code className="rounded bg-muted px-1 font-mono text-[10px]">
          GET /dashboard/summary
        </code>
      </ApiRouteHint>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  subHint,
  className = "",
}: {
  label: string;
  value: string;
  hint: string | null;
  subHint?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}
    >
      <p className="text-sm font-medium tracking-tight text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {subHint !== undefined ? (
        <p className="mt-1 text-xs text-primary">{subHint}</p>
      ) : null}
      {hint !== null ? (
        <p className="mt-1 text-xs text-destructive">{hint}</p>
      ) : null}
    </div>
  );
}
