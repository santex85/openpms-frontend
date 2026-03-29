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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  type BookingPatchBody,
  patchBooking,
} from "@/api/bookings";
import { BoardTapeGrid } from "@/components/board/BoardTapeGrid";
import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { UnassignedPool } from "@/components/board/UnassignedPool";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { getMonthRange, shiftMonthAnchor } from "@/utils/boardDates";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  const month = useMemo(
    () => getMonthRange(monthAnchor),
    [monthAnchor]
  );

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric",
      }).format(monthAnchor),
    [monthAnchor]
  );

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

  const patchBookingMut = useMutation({
    mutationFn: ({
      bookingId,
      body,
    }: {
      bookingId: string;
      body: BookingPatchBody;
    }) => patchBooking(bookingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", "availability"],
      });
    },
  });

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);
  const activeBookingByDndIdRef = useRef<Map<string, Booking>>(new Map());

  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null
  );
  const [rescheduleCheckIn, setRescheduleCheckIn] = useState("");
  const [rescheduleCheckOut, setRescheduleCheckOut] = useState("");

  useEffect(() => {
    if (rescheduleBooking === null) {
      return;
    }
    setRescheduleCheckIn(rescheduleBooking.check_in_date ?? "");
    setRescheduleCheckOut(rescheduleBooking.check_out_date ?? "");
  }, [rescheduleBooking]);

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

  const bookingMenuApi = useMemo<BoardBookingMenuApi | null>(() => {
    if (selectedPropertyId === null) {
      return null;
    }
    return {
      patchBooking: (bookingId, body) => {
        setBoardMessage(null);
        patchBookingMut.mutate(
          { bookingId, body },
          {
            onError: (e) => {
              setBoardMessage(formatApiError(e));
            },
          }
        );
      },
      openFolio: (bookingId) => {
        navigate(`/bookings/${bookingId}`);
      },
      openReschedule: (b) => {
        setRescheduleBooking(b);
      },
      patchIsPending: patchBookingMut.isPending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track isPending + stable mutate only
  }, [
    selectedPropertyId,
    navigate,
    patchBookingMut.isPending,
    patchBookingMut.mutate,
  ]);

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

  function applyReschedule(): void {
    if (rescheduleBooking === null) {
      return;
    }
    patchBookingMut.mutate(
      {
        bookingId: rescheduleBooking.id,
        body: {
          check_in: rescheduleCheckIn,
          check_out: rescheduleCheckOut,
        },
      },
      {
        onSuccess: () => {
          setRescheduleBooking(null);
        },
        onError: (e) => {
          setBoardMessage(formatApiError(e));
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Сетка</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Остатки в шапке, категории и номера слева. Месяц:{" "}
            <span className="font-medium text-foreground capitalize">
              {monthTitle}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Предыдущий месяц"
            onClick={() => {
              setMonthAnchor((a) => shiftMonthAnchor(a, -1));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMonthAnchor(new Date());
            }}
          >
            Сегодня
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Следующий месяц"
            onClick={() => {
              setMonthAnchor((a) => shiftMonthAnchor(a, 1));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedPropertyId === null ? (
        <p className="text-sm text-muted-foreground">
          Выберите отель в шапке, чтобы загрузить сетку.
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
          {(boardMessage !== null ||
            assignRoom.isError ||
            patchBookingMut.isError) && (
            <div
              className={cn(
                "mb-3 rounded-md border px-3 py-2 text-sm",
                assignRoom.isError || patchBookingMut.isError
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
              )}
              role="alert"
            >
              {assignRoom.isError
                ? formatApiError(assignRoom.error)
                : patchBookingMut.isError
                  ? formatApiError(patchBookingMut.error)
                  : boardMessage}
            </div>
          )}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <BoardTapeGrid
                days={month.days}
                roomTypes={sortedRoomTypes}
                rooms={rooms ?? []}
                bookings={bookingsForGrid}
                sumsByDate={sumsByDate}
                availabilityPending={showAvailabilityPending}
                availabilityError={availabilityError}
                bookingMenuApi={bookingMenuApi}
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

      <Dialog
        open={rescheduleBooking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleBooking(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перенос дат брони</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label htmlFor="res-ci" className="text-sm font-medium">
                Заезд (check_in)
              </label>
              <Input
                id="res-ci"
                type="date"
                value={rescheduleCheckIn}
                onChange={(e) => {
                  setRescheduleCheckIn(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="res-co" className="text-sm font-medium">
                Выезд (check_out, эксклюзивно)
              </label>
              <Input
                id="res-co"
                type="date"
                value={rescheduleCheckOut}
                onChange={(e) => {
                  setRescheduleCheckOut(e.target.value);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRescheduleBooking(null);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={patchBookingMut.isPending}
              onClick={applyReschedule}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
