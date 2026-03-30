import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBookings } from "@/hooks/useBookings";
import { useBookingsUnpaidFolio } from "@/hooks/useBookingsUnpaidFolio";
import { useHousekeepingColumn } from "@/hooks/useHousekeepingColumn";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";
import { formatIsoDateLocal } from "@/utils/boardDates";

export function DashboardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const today = useMemo(() => formatIsoDateLocal(new Date()), []);

  const bookingsToday = useBookings(today, today);
  const availabilityToday = useAvailabilityGrid(today, today);
  const dirtyColumn = useHousekeepingColumn("dirty", today);
  const unpaidFolio = useBookingsUnpaidFolio(true);

  const arrivalsToday = useMemo(() => {
    const list = bookingsToday.data ?? [];
    return list.filter((b) => b.check_in_date === today).length;
  }, [bookingsToday.data, today]);

  const departuresToday = useMemo(() => {
    const list = bookingsToday.data ?? [];
    return list.filter((b) => b.check_out_date === today).length;
  }, [bookingsToday.data, today]);

  const occupancy = useMemo(() => {
    const cells = availabilityToday.data?.cells ?? [];
    let total = 0;
    let booked = 0;
    for (const c of cells) {
      if (c.date === today) {
        total += c.total_rooms;
        booked += c.booked_rooms;
      }
    }
    return { booked, total };
  }, [availabilityToday.data?.cells, today]);

  const dirtyCount = dirtyColumn.data?.items.length ?? 0;

  const unpaidCount = unpaidFolio.data?.length;
  const unpaidList = unpaidFolio.data ?? [];

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Заезды сегодня"
          value={
            bookingsToday.isPending
              ? "…"
              : bookingsToday.isError
                ? "—"
                : String(arrivalsToday)
          }
          hint={bookingsToday.isError ? formatApiError(bookingsToday.error) : null}
        />
        <MetricCard
          label="Выезды сегодня"
          value={
            bookingsToday.isPending
              ? "…"
              : bookingsToday.isError
                ? "—"
                : String(departuresToday)
          }
          hint={bookingsToday.isError ? formatApiError(bookingsToday.error) : null}
        />
        <MetricCard
          label="Загрузка номеров (сегодня)"
          value={
            availabilityToday.isPending
              ? "…"
              : availabilityToday.isError
                ? "—"
                : `${occupancy.booked} / ${occupancy.total}`
          }
          hint={
            availabilityToday.isError
              ? formatApiError(availabilityToday.error)
              : null
          }
        />
        <MetricCard
          label="Номера «грязные»"
          value={
            dirtyColumn.isPending
              ? "…"
              : dirtyColumn.isError
                ? "—"
                : String(dirtyCount)
          }
          hint={dirtyColumn.isError ? formatApiError(dirtyColumn.error) : null}
        />
        <MetricCard
          label="Неоплаченные брони (фолио)"
          value={
            unpaidFolio.isPending
              ? "…"
              : unpaidFolio.isError
                ? "—"
                : String(unpaidCount ?? 0)
          }
          hint={
            unpaidFolio.isError
              ? `${formatApiError(unpaidFolio.error)} (нужен GET /bookings/unpaid-folio-summary)`
              : null
          }
          className="sm:col-span-2"
        />
      </div>

      {unpaidList.length > 0 ? (
        <div className="rounded-md border">
          <h3 className="border-b px-3 py-2 text-sm font-medium">
            Баланс к оплате (первые {unpaidList.length})
          </h3>
          <ul className="divide-y text-sm">
            {unpaidList.slice(0, 8).map((row) => (
              <li
                key={row.booking_id}
                className="flex flex-wrap justify-between gap-2 px-3 py-2"
              >
                <Link
                  to={`/bookings/${row.booking_id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {row.guest_name ?? row.booking_id.slice(0, 8)}
                </Link>
                <span className="tabular-nums font-medium">{row.balance}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Показатели на сегодня из броней, остатков, housekeeping и сводки фолио.
        Календарь — на странице{" "}
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
