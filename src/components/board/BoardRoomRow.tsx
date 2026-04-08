import { useDroppable } from "@dnd-kit/core";
import { Fragment, memo } from "react";

import {
  type BoardBookingMenuApi,
  BookingBlock,
} from "@/components/board/BookingBlock";
import { dndRoomId, dndRoomLabelId } from "@/lib/boardDnd";
import { cn } from "@/lib/utils";
import type { Booking, RoomRow } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";

export type { BoardBookingMenuApi };

function isNightBooked(roomBookings: Booking[], nightIso: string): boolean {
  return roomBookings.some(
    (b) =>
      b.check_in_date !== null &&
      b.check_out_date !== null &&
      b.check_in_date <= nightIso &&
      b.check_out_date > nightIso
  );
}

interface BoardRoomRowProps {
  room: RoomRow;
  days: MonthDayMeta[];
  innerColTemplate: string;
  roomBookings: Booking[];
  cellBorder: string;
  todayIso: string;
  nameIsDuplicate?: boolean;
  bookingMenuApi?: BoardBookingMenuApi | null;
  onEmptyCellClick?: (payload: { room: RoomRow; nightIso: string }) => void;
}

function BoardRoomRowInner({
  room,
  days,
  innerColTemplate,
  roomBookings,
  cellBorder,
  todayIso,
  nameIsDuplicate = false,
  bookingMenuApi,
  onEmptyCellClick,
}: BoardRoomRowProps) {
  const { setNodeRef: setTimelineRef, isOver: isOverTimeline } = useDroppable({
    id: dndRoomId(room.id),
  });
  const { setNodeRef: setLabelRef, isOver: isOverLabel } = useDroppable({
    id: dndRoomLabelId(room.id),
  });

  const isOver = isOverTimeline || isOverLabel;

  return (
    <Fragment>
      <div
        ref={setLabelRef}
        className={cn(
          cellBorder,
          "sticky left-0 z-[30] bg-background px-2 py-2 pl-4 text-xs text-muted-foreground pointer-events-auto transition-colors",
          isOver &&
            "z-[35] bg-primary/10 ring-2 ring-inset ring-primary/50",
          nameIsDuplicate &&
            "bg-destructive/10 ring-1 ring-inset ring-destructive/40"
        )}
        title={
          nameIsDuplicate
            ? "Такое же название номера есть ещё у одной строки — проверьте данные."
            : undefined
        }
      >
        {room.name}
      </div>
      <div
        ref={setTimelineRef}
        className={cn(
          cellBorder,
          "relative min-h-10 overflow-hidden bg-background pointer-events-auto transition-colors",
          isOver && "z-[25] bg-primary/10 ring-2 ring-inset ring-primary/50"
        )}
        style={{ gridColumn: "2 / -1" }}
        data-room-droppable={room.id}
      >
        <div
          className="grid min-h-10"
          style={{ gridTemplateColumns: innerColTemplate }}
        >
          {days.map((day) => {
            const booked = isNightBooked(roomBookings, day.iso);
            const clickable =
              onEmptyCellClick !== undefined && !booked && !isOver;
            return (
              <button
                key={day.iso}
                type="button"
                className={cn(
                  "block w-full min-h-10 appearance-none border-b-0 border-l-0 border-r border-t-0 border-border bg-transparent p-0 text-left last:border-r-0",
                  "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  day.iso === todayIso && "bg-primary/5",
                  clickable && "cursor-pointer",
                  !clickable && "cursor-default"
                )}
                aria-label={
                  booked
                    ? undefined
                    : `Действия: ${room.name}, ${day.iso}`
                }
                disabled={!clickable}
                tabIndex={clickable ? 0 : -1}
                onClick={() => {
                  if (clickable) {
                    onEmptyCellClick({ room, nightIso: day.iso });
                  }
                }}
              />
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0">
          {roomBookings.map((b) => (
            <BookingBlock
              key={b.id}
              booking={b}
              days={days}
              menuApi={bookingMenuApi}
            />
          ))}
        </div>
      </div>
    </Fragment>
  );
}

export const BoardRoomRow = memo(BoardRoomRowInner);
