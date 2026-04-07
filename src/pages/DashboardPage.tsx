import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import { formatApiError } from "@/lib/formatApiError";
import { formatMoneyAmount } from "@/lib/formatMoney";
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
  const { t, i18n } = useTranslation();
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
          {t("dashboard.selectProperty")}
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
          {t("dashboard.currencyOperations")}{" "}
          <span
            className={cn(
              "font-medium text-foreground",
              currencyCode === "THB" &&
                "cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-2"
            )}
            title={
              currencyCode === "THB"
                ? t("dashboard.currencyTooltip")
                : undefined
            }
          >
            {currencyCode}
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("dashboard.arrivalsToday")}
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
          label={t("dashboard.departuresToday")}
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
            label={t("dashboard.roomLoad")}
            value={
              summary.isPending
                ? "…"
                : summary.isError
                  ? "—"
                  : `${summary.data!.occupied_rooms} / ${summary.data!.total_rooms}`
            }
            hint={summary.isError ? formatApiError(summary.error) : null}
            footnote={t("dashboard.openBoard")}
          />
        </Link>
        <MetricCard
          label={t("dashboard.dirtyRooms")}
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
          {t("dashboard.chartTitle")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.chartHint")}
        </p>
        {chartGrid.isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {t("dashboard.chartError")}
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
          {t("dashboard.unpaidTitle")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t("dashboard.unpaidHint")}</span>
          <ApiRouteHint>
            GET /dashboard/summary (поле unpaid_folio)
          </ApiRouteHint>
        </p>
        {unpaid.isError ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {t("dashboard.unpaidError")}
                {unpaid.error != null ? (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {formatApiError(unpaid.error)}
                  </span>
                ) : null}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                void unpaid.refetch();
              }}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : unpaid.isPending ? (
          <div className="mt-3 h-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (unpaid.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("dashboard.unpaidEmpty")}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {t("dashboard.colGuest")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("dashboard.colBooking")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("dashboard.colBalance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(unpaid.data ?? []).map((row) => (
                  <tr key={row.booking_id} className="border-b border-border/80">
                    <td className="px-3 py-2">
                      {capitalizeGuestName(row.guest_name) ||
                        t("common.notAvailable")}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/bookings/${row.booking_id}`}
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                      >
                        {shortBookingId(row.booking_id)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatMoneyAmount(
                        currencyCode,
                        row.balance,
                        i18n.language
                      )}
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
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">
        {t("dashboard.title")}
      </h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span>{t("dashboard.subtitle")}</span>
        <ApiRouteHint className="text-xs">GET /dashboard/summary</ApiRouteHint>
        <Trans
          i18nKey="dashboard.calendarLinkRich"
          components={{
            l: (
              <Link
                to="/board"
                className="font-medium text-primary underline-offset-4 hover:underline"
              />
            ),
          }}
        />
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
