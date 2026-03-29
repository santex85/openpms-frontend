import { useDroppable } from "@dnd-kit/core";
import { Fragment } from "react";

import {
  type BoardBookingMenuApi,
  BookingBlock,
} from "@/components/board/BookingBlock";
import { dndRoomId, dndRoomLabelId } from "@/lib/boardDnd";
import { cn } from "@/lib/utils";
import type { Booking, RoomRow } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";

export type { BoardBookingMenuApi };

interface BoardRoomRowProps {
  room: RoomRow;
  days: MonthDayMeta[];
  innerColTemplate: string;
  roomBookings: Booking[];
  cellBorder: string;
  bookingMenuApi?: BoardBookingMenuApi | null;
}

export function BoardRoomRow({
  room,
  days,
  innerColTemplate,
  roomBookings,
  cellBorder,
  bookingMenuApi,
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
          "sticky left-0 z-10 bg-background px-2 py-2 pl-4 text-xs text-muted-foreground pointer-events-auto transition-colors",
          isOver && "z-[25] bg-primary/10 ring-2 ring-inset ring-primary/50"
        )}
      >
        {room.name}
      </div>
      <div
        ref={setTimelineRef}
        className={cn(
          cellBorder,
          "relative min-h-10 bg-background pointer-events-auto transition-colors",
          isOver && "z-[25] bg-primary/10 ring-2 ring-inset ring-primary/50"
        )}
        style={{ gridColumn: "2 / -1" }}
        data-room-droppable={room.id}
      >
        <div
          className="grid min-h-10"
          style={{ gridTemplateColumns: innerColTemplate }}
        >
          {days.map((day) => (
            <div
              key={day.iso}
              className={cn(
                "min-h-10 border-r border-border last:border-r-0",
                "hover:bg-muted/20"
              )}
              aria-hidden
            />
          ))}
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
