import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { boardLocaleFromI18n } from "@/utils/boardDates";

import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { BoardRoomRow } from "@/components/board/BoardRoomRow";
import { BoardUnassignedLaneRow } from "@/components/board/BoardUnassignedLaneRow";
import { cn } from "@/lib/utils";
import type { Booking, RoomRow, RoomType } from "@/types/api";
import { formatIsoDateLocal, type MonthDayMeta } from "@/utils/boardDates";

const cellBorder = "border-b border-r border-border";

interface BoardTapeGridProps {
  days: MonthDayMeta[];
  roomTypes: RoomType[];
  rooms: RoomRow[];
  bookings: Booking[];
  sumsByDate: Map<string, number>;
  availabilityPending: boolean;
  availabilityError: boolean;
  /** ISO YYYY-MM-DD; defaults to today (local). */
  todayIso?: string;
  duplicateRoomNameKeys?: ReadonlySet<string>;
  bookingMenuApi?: BoardBookingMenuApi | null;
  onEmptyCellClick?: (payload: { room: RoomRow; nightIso: string }) => void;
  /** Bookings without a physical room, grouped by room type id (shown in overflow lane per category). */
  unassignedByRoomTypeId?: ReadonlyMap<string, Booking[]>;
}

export function BoardTapeGrid({
  days,
  roomTypes,
  rooms,
  bookings,
  sumsByDate,
  availabilityPending,
  availabilityError,
  todayIso = formatIsoDateLocal(new Date()),
  duplicateRoomNameKeys,
  bookingMenuApi,
  onEmptyCellClick,
  unassignedByRoomTypeId,
}: BoardTapeGridProps) {
  const { t, i18n } = useTranslation();
  const labelHeader = t("board.dateRoomCol");
  const emptyTypes = t("board.emptyRoomTypes");
  const emptyRooms = t("board.emptyRooms");
  const colTemplate = useMemo(() => {
    const n = days.length;
    return `minmax(9rem, 12rem) repeat(${n}, minmax(3rem, 1fr))`;
  }, [days.length]);

  const innerColTemplate = useMemo(() => {
    const n = days.length;
    return `repeat(${n}, minmax(3rem, 1fr))`;
  }, [days.length]);

  const dayFormatter = useMemo(() => {
    const loc = boardLocaleFromI18n(i18n.language);
    return new Intl.DateTimeFormat(loc, {
      weekday: "short",
      day: "numeric",
    });
  }, [i18n.language]);

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
    const sortLoc = boardLocaleFromI18n(i18n.language);
    for (const [, list] of m) {
      list.sort((a, b) =>
        a.name.localeCompare(b.name, sortLoc, { sensitivity: "base" })
      );
    }
    return m;
  }, [rooms, i18n.language]);

  if (roomTypes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyTypes}</p>;
  }

  if (rooms.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyRooms}</p>;
  }

  const totalRooms = rooms.length;

  return (
    <div className="max-h-[min(70vh,calc(100vh-8rem))] overflow-auto scroll-smooth rounded-md border border-border bg-background shadow-sm sm:snap-x sm:snap-mandatory">
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
          <div className="mt-0.5 text-[0.6rem] text-muted-foreground">
            {t("board.occupancy")}
          </div>
        </div>
        {days.map((day) => {
          const available = sumsByDate.get(day.iso) ?? 0;
          const occ =
            totalRooms > 0
              ? Math.round(((totalRooms - available) / totalRooms) * 100)
              : 0;
          return (
          <div
            key={day.iso}
            className={cn(
              cellBorder,
              "sticky top-0 z-20 bg-card/95 px-1 py-2 text-center backdrop-blur-sm",
              day.iso === todayIso &&
                "bg-primary/10 ring-1 ring-inset ring-primary/35"
            )}
          >
            <div className="text-xs font-medium leading-tight text-foreground md:text-sm sm:snap-start">
              {dayFormatter.format(day.date)}
            </div>
            <div className="mt-1 text-[0.65rem] tabular-nums text-muted-foreground md:text-xs">
              {day.iso.slice(5)}
            </div>
            <div
              className={cn(
                "mt-1 text-sm font-semibold tabular-nums",
                occ >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : occ >= 50
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
            >
              {availabilityError ? "—" : availabilityPending ? "…" : `${occ}%`}
            </div>
          </div>
          );
        })}

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

              {unassignedByRoomTypeId !== undefined &&
                (unassignedByRoomTypeId.get(rt.id)?.length ?? 0) > 0 && (
                  <BoardUnassignedLaneRow
                    roomTypeName={rt.name}
                    days={days}
                    innerColTemplate={innerColTemplate}
                    laneBookings={unassignedByRoomTypeId.get(rt.id) ?? []}
                    cellBorder={cellBorder}
                    todayIso={todayIso}
                    bookingMenuApi={bookingMenuApi}
                  />
                )}

              {roomsInType.map((room) => (
                <BoardRoomRow
                  key={room.id}
                  room={room}
                  days={days}
                  innerColTemplate={innerColTemplate}
                  roomBookings={bookingsByRoomId.get(room.id) ?? []}
                  cellBorder={cellBorder}
                  todayIso={todayIso}
                  nameIsDuplicate={
                    duplicateRoomNameKeys !== undefined &&
                    duplicateRoomNameKeys.has(room.name.trim().toLowerCase())
                  }
                  bookingMenuApi={bookingMenuApi}
                  onEmptyCellClick={onEmptyCellClick}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
