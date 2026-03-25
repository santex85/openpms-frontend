import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BoardTapeGrid } from "@/components/board/BoardTapeGrid";
import { UnassignedPool } from "@/components/board/UnassignedPool";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useAssignBookingRoom } from "@/hooks/useAssignBookingRoom";
import { useBookings } from "@/hooks/useBookings";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import {
  bookingFromBoardDragData,
  parseRoomIdFromDndOver,
} from "@/lib/boardDnd";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";
import type { Booking, RoomRow } from "@/types/api";
import { cn } from "@/lib/utils";
import { getMonthRange } from "@/utils/boardDates";
import { sumAvailableByDate } from "@/utils/inventoryAggregate";

const boardCollisionDetection: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  if (byPointer.length > 0) {
    const hit = getFirstCollision(byPointer);
    return hit !== null ? [hit] : [];
  }
  return closestCenter(args);
};

function bookingOverlapsMonth(
  b: Booking,
  startIso: string,
  endIso: string
): boolean {
  if (b.check_in_date === null || b.check_out_date === null) {
    return false;
  }
  return b.check_in_date <= endIso && b.check_out_date > startIso;
}

function DragOverlayCard({ booking }: { booking: Booking }) {
  const guestLabel =
    `${booking.guest.last_name} ${booking.guest.first_name}`.trim();
  const datesLabel =
    booking.check_in_date !== null && booking.check_out_date !== null
      ? `${booking.check_in_date} → ${booking.check_out_date}`
      : "—";
  return (
    <div className="max-w-[260px] cursor-grabbing rounded-md border border-border bg-card p-3 text-left shadow-lg">
      <div className="text-sm font-semibold text-foreground">{guestLabel}</div>
      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
        {datesLabel}
      </div>
    </div>
  );
}

export function BoardPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const month = useMemo(() => getMonthRange(new Date()), []);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: rooms, isPending: roomsPending } = useRooms();
  const {
    data: bookingsRaw,
    isPending: bookingsPending,
  } = useBookings(month.startIso, month.endIso);
  const {
    data: availabilityGrid,
    isPending: availabilityPending,
    isError: availabilityError,
  } = useAvailabilityGrid(month.startIso, month.endIso);

  const assignRoom = useAssignBookingRoom();

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);
  const activeBookingByDndIdRef = useRef<Map<string, Booking>>(new Map());

  useEffect(() => {
    if (boardMessage === null) {
      return;
    }
    const t = window.setTimeout(() => {
      setBoardMessage(null);
    }, 5000);
    return () => {
      window.clearTimeout(t);
    };
  }, [boardMessage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const dayIsoSet = useMemo(
    () => new Set(month.days.map((d) => d.iso)),
    [month.days]
  );

  const sumsByDate = useMemo(
    () => sumAvailableByDate(availabilityGrid?.cells ?? [], dayIsoSet),
    [availabilityGrid?.cells, dayIsoSet]
  );

  const bookingsForGrid = useMemo(() => {
    const list = bookingsRaw ?? [];
    if (selectedPropertyId === null) {
      return [];
    }
    return list.filter(
      (b) =>
        b.room_id !== null &&
        b.check_in_date !== null &&
        b.check_out_date !== null &&
        b.property_id === selectedPropertyId
    );
  }, [bookingsRaw, selectedPropertyId]);

  const unassignedBookings = useMemo(() => {
    const list = bookingsRaw ?? [];
    if (selectedPropertyId === null) {
      return [];
    }
    return list.filter(
      (b) =>
        b.room_id === null &&
        b.check_in_date !== null &&
        b.check_out_date !== null &&
        b.property_id === selectedPropertyId &&
        bookingOverlapsMonth(b, month.startIso, month.endIso)
    );
  }, [bookingsRaw, selectedPropertyId, month.startIso, month.endIso]);

  const sortedRoomTypes = useMemo(() => {
    const list = roomTypes ?? [];
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
    );
  }, [roomTypes]);

  const showAvailabilityPending =
    Boolean(selectedPropertyId) && availabilityPending;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      assignRoom.reset();
      setBoardMessage(null);
      const booking = bookingFromBoardDragData(event.active.data.current);
      setActiveBooking(booking ?? null);
      const id = String(event.active.id);
      activeBookingByDndIdRef.current.clear();
      if (booking !== undefined) {
        activeBookingByDndIdRef.current.set(id, booking);
      }
    },
    [assignRoom]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBooking(null);
      const { active, over } = event;
      const activeId = String(active.id);
      const booking =
        bookingFromBoardDragData(active.data.current) ??
        activeBookingByDndIdRef.current.get(activeId);
      activeBookingByDndIdRef.current.clear();
      if (over === null) {
        return;
      }
      if (booking === undefined) {
        return;
      }
      const roomId = parseRoomIdFromDndOver(String(over.id));
      if (roomId === null) {
        return;
      }
      const roomsList: RoomRow[] = rooms ?? [];
      const room = roomsList.find((r) => r.id === roomId);
      if (room === undefined) {
        return;
      }
      const rtId = booking.room_type_id ?? null;
      if (rtId !== null && room.room_type_id !== rtId) {
        setBoardMessage(
          "Номер другой категории — перетащите бронь в строку того же типа номера."
        );
        return;
      }
      void assignRoom.mutate({ bookingId: booking.id, roomId });
    },
    [assignRoom, rooms]
  );

  const handleDragCancel = useCallback(() => {
    setActiveBooking(null);
    activeBookingByDndIdRef.current.clear();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Шахматка</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Текущий месяц: остатки по датам в шапке, категории и номера слева.
        </p>
      </div>

      {selectedPropertyId === null ? (
        <p className="text-sm text-muted-foreground">
          Выберите отель в шапке, чтобы загрузить шахматку.
        </p>
      ) : roomTypesPending || roomsPending ? (
        <div
          className="h-48 animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {(boardMessage !== null || assignRoom.isError) && (
            <div
              className={cn(
                "mb-3 rounded-md border px-3 py-2 text-sm",
                assignRoom.isError
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
              )}
              role="alert"
            >
              {assignRoom.isError
                ? formatApiError(assignRoom.error)
                : boardMessage}
            </div>
          )}
          <div className="flex flex-row items-start gap-4">
            <div className="min-w-0 flex-1">
              <BoardTapeGrid
                days={month.days}
                roomTypes={sortedRoomTypes}
                rooms={rooms ?? []}
                bookings={bookingsForGrid}
                sumsByDate={sumsByDate}
                availabilityPending={showAvailabilityPending}
                availabilityError={availabilityError}
              />
            </div>
            <UnassignedPool
              bookings={unassignedBookings}
              roomTypes={sortedRoomTypes}
              isLoading={bookingsPending}
            />
          </div>
          <DragOverlay
            dropAnimation={null}
            modifiers={[snapCenterToCursor]}
          >
            {activeBooking !== null ? (
              <DragOverlayCard booking={activeBooking} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
