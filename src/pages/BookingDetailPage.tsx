import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useBookingFolio } from "@/hooks/useBookingFolio";
import { useBookings } from "@/hooks/useBookings";
import { Button } from "@/components/ui/button";
import { formatIsoDateLocal } from "@/utils/boardDates";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? "";

  const range = useMemo(() => {
    const end = addDays(new Date(), 120);
    const start = addDays(new Date(), -120);
    return {
      startIso: formatIsoDateLocal(start),
      endIso: formatIsoDateLocal(end),
    };
  }, []);

  const { data: bookings, isPending: tapePending } = useBookings(
    range.startIso,
    range.endIso
  );

  const booking = useMemo(
    () => (bookings ?? []).find((b) => b.id === bookingId),
    [bookings, bookingId]
  );

  const { data: folio, isPending: folioPending, isError: folioError } =
    useBookingFolio(bookingId || undefined);

  if (bookingId === "") {
    return (
      <p className="text-sm text-muted-foreground">Не указан id брони.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/bookings">← К списку</Link>
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Бронь {bookingId.slice(0, 8)}…
        </h2>
        {tapePending ? (
          <p className="text-sm text-muted-foreground">Загрузка карточки…</p>
        ) : booking === undefined ? (
          <p className="text-sm text-muted-foreground">
            Краткая карточка не найдена в текущем окне дат; фолио ниже — по API.
          </p>
        ) : (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Гость</dt>
              <dd className="font-medium">
                {booking.guest.last_name} {booking.guest.first_name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Статус</dt>
              <dd>{booking.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Заезд / выезд</dt>
              <dd className="tabular-nums">
                {booking.check_in_date ?? "—"} →{" "}
                {booking.check_out_date ?? "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground">Фолио</h3>
        {folioError ? (
          <p className="mt-2 text-sm text-destructive">
            Не удалось загрузить фолио.
          </p>
        ) : folioPending ? (
          <div
            className="mt-2 h-32 animate-pulse rounded-md bg-muted"
            aria-hidden
          />
        ) : folio === undefined ? null : (
          <div className="mt-2 space-y-2">
            <p className="text-sm">
              Баланс:{" "}
              <span className="font-semibold tabular-nums">{folio.balance}</span>
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5">Дата</th>
                    <th className="px-2 py-1.5">Тип</th>
                    <th className="px-2 py-1.5">Категория</th>
                    <th className="px-2 py-1.5 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {folio.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                        {t.created_at.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1.5">{t.transaction_type}</td>
                      <td className="px-2 py-1.5">{t.category}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {t.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {folio.transactions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Транзакций нет.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
