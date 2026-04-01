import { Link } from "react-router-dom";

import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";

import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";

function shortBookingId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function DashboardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const summary = useDashboardSummary();
  const unpaid = useBookingsUnpaidFolio(selectedPropertyId !== null);

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

  const currencyHint =
    summary.data !== undefined
      ? `Валюта отеля: ${summary.data.currency}.`
      : null;

  return (
    <div className="space-y-6">
      <PageTitle />

      {currencyHint !== null ? (
        <p className="text-xs text-muted-foreground">{currencyHint}</p>
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
        <h3 className="text-sm font-semibold text-foreground">
          Неоплаченные фолио
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-[10px]">
            GET /bookings/unpaid-folio-summary
          </code>
        </p>
        {unpaid.isError ? (
          <p className="mt-2 text-sm text-destructive">
            Не удалось загрузить балансы фолио.
          </p>
        ) : unpaid.isPending ? (
          <div className="mt-3 h-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (unpaid.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Нет броней с положительным балансом по ответу API.
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
                    <td className="px-3 py-2">
                      {row.guest_name ?? "—"}
                    </td>
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
      <p className="mt-1 text-sm text-muted-foreground">
        Операционные показатели на сегодня (
        <code className="rounded bg-muted px-1 font-mono text-xs">
          GET /dashboard/summary
        </code>
        ). Календарь — на странице{" "}
        <Link
          to="/board"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Сетка
        </Link>
        .
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  hint: string | null;
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
      {hint !== null ? (
        <p className="mt-1 text-xs text-destructive">{hint}</p>
      ) : null}
    </div>
  );
}
