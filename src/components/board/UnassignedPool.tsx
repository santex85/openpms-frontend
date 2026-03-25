import { useDraggable } from "@dnd-kit/core";

import { dndBookingId, type BoardBookingDragData } from "@/lib/boardDnd";
import { cn } from "@/lib/utils";
import type { Booking, RoomType } from "@/types/api";

function roomTypeName(
  roomTypes: RoomType[],
  roomTypeId: string | null
): string {
  if (roomTypeId === null) {
    return "Категория не указана";
  }
  const rt = roomTypes.find((r) => r.id === roomTypeId);
  return rt?.name ?? "Категория не указана";
}

interface DraggableUnassignedCardProps {
  booking: Booking;
  roomTypes: RoomType[];
}

function DraggableUnassignedCard({
  booking,
  roomTypes,
}: DraggableUnassignedCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndBookingId(booking.id),
    data: { type: "unassigned_booking", booking } satisfies BoardBookingDragData,
  });

  const guestLabel =
    `${booking.guest.last_name} ${booking.guest.first_name}`.trim();
  const datesLabel =
    booking.check_in_date !== null && booking.check_out_date !== null
      ? `${booking.check_in_date} → ${booking.check_out_date}`
      : "—";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "cursor-grab touch-none rounded-md border border-border bg-card p-3 text-left shadow-sm active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
      {...listeners}
      {...attributes}
    >
      <div className="text-sm font-semibold text-foreground">{guestLabel}</div>
      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
        {datesLabel}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {roomTypeName(roomTypes, booking.room_type_id ?? null)}
      </div>
    </div>
  );
}

interface UnassignedPoolProps {
  bookings: Booking[];
  roomTypes: RoomType[];
  isLoading?: boolean;
}

export function UnassignedPool({
  bookings,
  roomTypes,
  isLoading = false,
}: UnassignedPoolProps) {
  return (
    <aside className="w-[min(100%,280px)] shrink-0 rounded-md border border-border bg-muted/20 p-3">
      <h3 className="text-sm font-semibold text-foreground">Без номера</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Перетащите бронь на строку номера той же категории.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {isLoading ? (
          <div
            className="h-16 animate-pulse rounded-md bg-muted"
            aria-hidden
          />
        ) : bookings.length === 0 ? (
          <p className="text-xs text-muted-foreground">Нет неназначенных броней.</p>
        ) : (
          bookings.map((b) => (
            <DraggableUnassignedCard
              key={b.id}
              booking={b}
              roomTypes={roomTypes}
            />
          ))
        )}
      </div>
    </aside>
  );
}
