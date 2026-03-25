import { Fragment, useMemo } from "react";

import { BoardRoomRow } from "@/components/board/BoardRoomRow";
import { cn } from "@/lib/utils";
import type { Booking, RoomRow, RoomType } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";

const labelHeader = "Дата / Номер";

const cellBorder = "border-b border-r border-border";

interface BoardTapeGridProps {
  days: MonthDayMeta[];
  roomTypes: RoomType[];
  rooms: RoomRow[];
  bookings: Booking[];
  sumsByDate: Map<string, number>;
  availabilityPending: boolean;
  availabilityError: boolean;
}

export function BoardTapeGrid({
  days,
  roomTypes,
  rooms,
  bookings,
  sumsByDate,
  availabilityPending,
  availabilityError,
}: BoardTapeGridProps) {
  const colTemplate = useMemo(() => {
    const n = days.length;
    return `minmax(10rem, 14rem) repeat(${n}, minmax(3.5rem, 1fr))`;
  }, [days.length]);

  const innerColTemplate = useMemo(() => {
    const n = days.length;
    return `repeat(${n}, minmax(3.5rem, 1fr))`;
  }, [days.length]);

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "numeric",
      }),
    []
  );

  const bookingsByRoomId = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.room_id === null) {
        continue;
      }
      const list = m.get(b.room_id) ?? [];
      list.push(b);
      m.set(b.room_id, list);
    }
    return m;
  }, [bookings]);

  const roomsByTypeId = useMemo(() => {
    const m = new Map<string, RoomRow[]>();
    for (const r of rooms) {
      const list = m.get(r.room_type_id) ?? [];
      list.push(r);
      m.set(r.room_type_id, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) =>
        a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
      );
    }
    return m;
  }, [rooms]);

  if (roomTypes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет категорий номеров для выбранного отеля. Добавьте типы номеров в
        системе.
      </p>
    );
  }

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет физических номеров для отеля. Добавьте комнаты, чтобы отобразить
        строки шахматки и брони.
      </p>
    );
  }

  return (
    <div className="max-h-[min(70vh,calc(100vh-8rem))] overflow-auto rounded-md border border-border bg-background shadow-sm">
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: colTemplate }}
      >
        {/* Header row */}
        <div
          className={cn(
            cellBorder,
            "sticky left-0 top-0 z-30 bg-muted/90 px-2 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm"
          )}
        >
          {labelHeader}
        </div>
        {days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              cellBorder,
              "sticky top-0 z-20 bg-card/95 px-1 py-2 text-center backdrop-blur-sm"
            )}
          >
            <div className="text-xs font-medium capitalize leading-tight text-foreground">
              {dayFormatter.format(day.date)}
            </div>
            <div className="mt-1 text-[0.65rem] tabular-nums text-muted-foreground">
              {day.iso.slice(5)}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {availabilityError ? (
                <span className="text-destructive">—</span>
              ) : availabilityPending ? (
                <span className="text-muted-foreground">…</span>
              ) : (
                sumsByDate.get(day.iso) ?? 0
              )}
            </div>
          </div>
        ))}

        {roomTypes.map((rt) => {
          const roomsInType = roomsByTypeId.get(rt.id) ?? [];
          if (roomsInType.length === 0) {
            return null;
          }

          return (
            <Fragment key={rt.id}>
              <div
                className={cn(
                  cellBorder,
                  "sticky left-0 z-10 bg-muted/50 px-2 py-1.5 text-xs font-semibold text-foreground"
                )}
              >
                {rt.name}
              </div>
              <div
                className={cn(cellBorder, "bg-muted/30")}
                style={{ gridColumn: "2 / -1" }}
                aria-hidden
              />

              {roomsInType.map((room) => (
                <BoardRoomRow
                  key={room.id}
                  room={room}
                  days={days}
                  innerColTemplate={innerColTemplate}
                  roomBookings={bookingsByRoomId.get(room.id) ?? []}
                  cellBorder={cellBorder}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
