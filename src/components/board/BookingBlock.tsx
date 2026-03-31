import { useDraggable } from "@dnd-kit/core";
import { useMemo } from "react";

import type { BookingPatchBody } from "@/api/bookings";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { dndBookingId, type BoardBookingDragData } from "@/lib/boardDnd";
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

function statusClasses(status: string): string {
  const s = status.toLowerCase();
  if (s === "confirmed") {
    return "border-blue-700 bg-blue-600/90 text-white";
  }
  if (s === "checked_in" || s === "checked-in") {
    return "border-emerald-700 bg-emerald-600/90 text-white";
  }
  if (
    s === "checked_out" ||
    s === "checked-out" ||
    s === "checkedout"
  ) {
    return "border-violet-800 bg-violet-700/90 text-white";
  }
  if (s === "cancelled" || s === "canceled") {
    return "border-border bg-muted/90 text-muted-foreground line-through";
  }
  if (s === "tentative" || s === "hold") {
    return "border-amber-700 bg-amber-500/90 text-white";
  }
  return "border-slate-600 bg-slate-600/90 text-white";
}

interface DraggableBookingTileProps {
  booking: Booking;
  layout: BookingTileLayout;
  menuApi?: BoardBookingMenuApi | null;
}

function DraggableBookingTile({
  booking,
  layout,
  menuApi,
}: DraggableBookingTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndBookingId(booking.id),
    data: { type: "assigned_booking", booking } satisfies BoardBookingDragData,
  });

  const tile = (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto absolute touch-none select-none rounded-sm border px-1 py-0.5 text-left text-[0.65rem] font-semibold leading-tight shadow-sm",
        "cursor-grab active:cursor-grabbing",
        statusClasses(booking.status),
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
      title={`${booking.guest.last_name} ${booking.guest.first_name}`}
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
      <span className="block truncate">{booking.guest.last_name}</span>
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
}

export interface BookingBlockProps {
  booking: Booking;
  days: MonthDayMeta[];
  menuApi?: BoardBookingMenuApi | null;
}

export function BookingBlock({ booking, days, menuApi }: BookingBlockProps) {
  const layout = useMemo(() => {
    if (
      booking.check_in_date === null ||
      booking.check_out_date === null ||
      booking.room_id === null
    ) {
      return null;
    }
    return computeBookingTileLayout(
      days,
      booking.check_in_date,
      booking.check_out_date
    );
  }, [booking.check_in_date, booking.check_out_date, booking.room_id, days]);

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
