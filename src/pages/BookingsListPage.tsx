import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useBookings } from "@/hooks/useBookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePropertyStore } from "@/stores/property-store";
import { formatIsoDateLocal } from "@/utils/boardDates";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function BookingsListPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const range = useMemo(() => {
    const end = new Date();
    const start = addDays(end, -90);
    return {
      startIso: formatIsoDateLocal(start),
      endIso: formatIsoDateLocal(end),
    };
  }, []);

  const { data: bookings, isPending, isError } = useBookings(
    range.startIso,
    range.endIso
  );

  const filtered = useMemo(() => {
    const list = bookings ?? [];
    let out = list;
    if (statusFilter.trim() !== "") {
      const s = statusFilter.trim().toLowerCase();
      out = out.filter((b) => b.status.toLowerCase().includes(s));
    }
    if (q.trim() !== "") {
      const qq = q.trim().toLowerCase();
      out = out.filter(
        (b) =>
          b.guest.last_name.toLowerCase().includes(qq) ||
          b.guest.first_name.toLowerCase().includes(qq) ||
          b.id.toLowerCase().includes(qq)
      );
    }
    return out;
  }, [bookings, statusFilter, q]);

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Выберите отель в шапке.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Бронирования</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Последние 90 дней по выбранному отелю. Фильтры локально по списку.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Статус (часть строки)"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="Гость или ID брони"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
      </div>
      {isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить брони.</p>
      ) : isPending ? (
        <div className="h-40 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Гость</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Заезд</th>
                <th className="px-3 py-2 font-medium">Выезд</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-border/80">
                  <td className="px-3 py-2">
                    {b.guest.last_name} {b.guest.first_name}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {b.status}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {b.check_in_date ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {b.check_out_date ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/bookings/${b.id}`}>Открыть</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Нет записей.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
