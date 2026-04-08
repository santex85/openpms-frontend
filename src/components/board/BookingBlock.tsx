import { useDraggable } from "@dnd-kit/core";
import { memo, useMemo } from "react";

import type { BookingPatchBody } from "@/api/bookings";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import { dndBookingId, type BoardBookingDragData } from "@/lib/boardDnd";
import { bookingStatusTileClasses } from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";
import {
  computeBookingTileLayout,
  type BookingTileLayout,
} from "@/utils/bookingTileLayout";

export interface BoardBookingMenuApi {
  patchBooking: (bookingId: string, body: BookingPatchBody) => void;
  openFolio: (bookingId: string) => void;
  openReschedule: (booking: Booking) => void;
  openBookingSummary: (booking: Booking) => void;
  patchIsPending: boolean;
}

interface DraggableBookingTileProps {
  booking: Booking;
  layout: BookingTileLayout;
  menuApi?: BoardBookingMenuApi | null;
}

const DraggableBookingTile = memo(function DraggableBookingTile({
  booking,
  layout,
  menuApi,
}: DraggableBookingTileProps) {
  const dragData: BoardBookingDragData =
    booking.room_id === null
      ? { type: "unassigned_booking", booking }
      : { type: "assigned_booking", booking };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndBookingId(booking.id),
    data: dragData,
  });

  const tile = (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto absolute flex min-w-0 touch-none select-none items-center justify-center rounded-sm border px-1 py-0.5 text-center text-[0.65rem] font-semibold leading-tight shadow-sm",
        "cursor-grab active:cursor-grabbing",
        bookingStatusTileClasses(booking.status),
        isDragging && "opacity-40",
        menuApi?.patchIsPending === true && "opacity-70"
      )}
      style={{
        left: `${layout.leftPercent}%`,
        width: `${layout.widthPercent}%`,
        top: "4px",
        height: "calc(100% - 8px)",
        zIndex: 20,
      }}
      title={`${capitalizeGuestName(booking.guest.last_name)} ${capitalizeGuestName(booking.guest.first_name)}`}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging && menuApi !== undefined && menuApi !== null) {
          menuApi.openBookingSummary(booking);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          if (!isDragging && menuApi !== undefined && menuApi !== null) {
            menuApi.openBookingSummary(booking);
          }
        }
      }}
    >
      <span className="block max-w-full truncate">
        {[
          capitalizeGuestName(booking.guest.last_name),
          booking.guest.first_name?.charAt(0)
            ? `${booking.guest.first_name.charAt(0).toUpperCase()}.`
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      </span>
    </div>
  );

  if (menuApi === undefined || menuApi === null) {
    return tile;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{tile}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          disabled={menuApi.patchIsPending}
          onSelect={() => {
            menuApi.patchBooking(booking.id, { status: "checked_in" });
          }}
        >
          Заселение (check-in)
        </ContextMenuItem>
        <ContextMenuItem
          disabled={menuApi.patchIsPending}
          onSelect={() => {
            menuApi.patchBooking(booking.id, { status: "checked_out" });
          }}
        >
          Выселение (check-out)
        </ContextMenuItem>
        <ContextMenuItem
          disabled={menuApi.patchIsPending}
          onSelect={() => {
            menuApi.patchBooking(booking.id, {
              status: "cancelled",
              cancellation_reason: "Отмена из сетки",
            });
          }}
        >
          Отмена
        </ContextMenuItem>
        <ContextMenuItem
          disabled={menuApi.patchIsPending}
          onSelect={() => {
            menuApi.openReschedule(booking);
          }}
        >
          Перенос дат…
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            menuApi.openFolio(booking.id);
          }}
        >
          Фолио
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export interface BookingBlockProps {
  booking: Booking;
  days: MonthDayMeta[];
  menuApi?: BoardBookingMenuApi | null;
}

function BookingBlockInner({ booking, days, menuApi }: BookingBlockProps) {
  const layout = useMemo(() => {
    if (
      booking.check_in_date === null ||
      booking.check_out_date === null
    ) {
      return null;
    }
    return computeBookingTileLayout(
      days,
      booking.check_in_date,
      booking.check_out_date
    );
  }, [booking.check_in_date, booking.check_out_date, days]);

  if (layout === null) {
    return null;
  }

  return (
    <DraggableBookingTile
      booking={booking}
      layout={layout}
      menuApi={menuApi}
    />
  );
}

export const BookingBlock = memo(BookingBlockInner);
