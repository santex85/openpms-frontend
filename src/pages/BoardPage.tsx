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
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { type BookingPatchBody, patchBooking } from "@/api/bookings";
import { putAvailabilityOverride } from "@/api/inventory";
import { BoardTapeGrid } from "@/components/board/BoardTapeGrid";
import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { UnassignedPool } from "@/components/board/UnassignedPool";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useAssignBookingRoom } from "@/hooks/useAssignBookingRoom";
import { useBookings } from "@/hooks/useBookings";
import { useCreateBooking } from "@/hooks/useCreateBooking";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import {
  bookingFromBoardDragData,
  parseRoomIdFromDndOver,
} from "@/lib/boardDnd";
import { formatApiError } from "@/lib/formatApiError";
import { useCanWriteBookings, useCanWriteInventory } from "@/hooks/useAuthz";
import { usePropertyStore } from "@/stores/property-store";
import type { AvailabilityCell } from "@/types/inventory";
import type { Booking, BookingCreateRequest, RoomRow } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  formatIsoDateLocal,
  getMonthRange,
  shiftMonthAnchor,
} from "@/utils/boardDates";
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

function addOneDayIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return formatIsoDateLocal(dt);
}

function formatBoardCreateBookingError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    const detail = data.detail;
    if (
      typeof detail === "object" &&
      detail !== null &&
      "missing_dates" in detail
    ) {
      const md = (detail as { missing_dates: unknown }).missing_dates;
      if (Array.isArray(md)) {
        return `Нет ночных тарифов на даты: ${md.map(String).join(", ")}. Задайте цены в разделе «Тарифы».`;
      }
    }
    if (err.response.status === 409) {
      return "Недостаточно свободных номеров на выбранные даты (409).";
    }
  }
  return formatApiError(err);
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
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();
  const createBookingMut = useCreateBooking();

  const canWriteBookings = useCanWriteBookings();
  const canWriteInventory = useCanWriteInventory();

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

  const blockInventoryMut = useMutation({
    mutationFn: putAvailabilityOverride,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["inventory", "availability"],
      });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setCellAction(null);
      setCellBlockError(null);
    },
    onError: (err: unknown) => {
      setCellBlockError(formatApiError(err));
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

  const [cellAction, setCellAction] = useState<{
    room: RoomRow;
    nightIso: string;
  } | null>(null);
  const [cellRatePlanId, setCellRatePlanId] = useState("");
  const [cellCheckIn, setCellCheckIn] = useState("");
  const [cellCheckOut, setCellCheckOut] = useState("");
  const [cellGuestFirst, setCellGuestFirst] = useState("");
  const [cellGuestLast, setCellGuestLast] = useState("");
  const [cellGuestEmail, setCellGuestEmail] = useState("");
  const [cellGuestPhone, setCellGuestPhone] = useState("");
  const [cellGuestPassport, setCellGuestPassport] = useState("");
  const [cellCreateError, setCellCreateError] = useState<string | null>(null);
  const [cellBlockError, setCellBlockError] = useState<string | null>(null);

  const [summaryBooking, setSummaryBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (rescheduleBooking === null) {
      return;
    }
    setRescheduleCheckIn(rescheduleBooking.check_in_date ?? "");
    setRescheduleCheckOut(rescheduleBooking.check_out_date ?? "");
  }, [rescheduleBooking]);

  useEffect(() => {
    if (cellAction === null) {
      return;
    }
    setCellCheckIn(cellAction.nightIso);
    setCellCheckOut(addOneDayIso(cellAction.nightIso));
    setCellCreateError(null);
    setCellBlockError(null);
    setCellGuestFirst("");
    setCellGuestLast("");
    setCellGuestEmail("");
    setCellGuestPhone("");
    setCellGuestPassport("");
    if (ratePlans !== undefined && ratePlans.length > 0) {
      setCellRatePlanId(ratePlans[0].id);
    } else {
      setCellRatePlanId("");
    }
  }, [cellAction, ratePlans]);

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

  const availabilityByKey = useMemo(() => {
    const m = new Map<string, AvailabilityCell>();
    for (const cell of availabilityGrid?.cells ?? []) {
      m.set(`${cell.date}_${cell.room_type_id}`, cell);
    }
    return m;
  }, [availabilityGrid?.cells]);

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

  const roomNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms ?? []) {
      m.set(r.id, r.name);
    }
    return m;
  }, [rooms]);

  const roomTypeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const rt of sortedRoomTypes) {
      m.set(rt.id, rt.name);
    }
    return m;
  }, [sortedRoomTypes]);

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
      openBookingSummary: (b) => {
        setSummaryBooking(b);
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

  async function handleCellCreateBooking(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setCellCreateError(null);
    if (cellAction === null || selectedPropertyId === null) {
      return;
    }
    if (cellRatePlanId === "") {
      setCellCreateError("Выберите тарифный план.");
      return;
    }
    if (cellCheckOut <= cellCheckIn) {
      setCellCreateError("Дата выезда должна быть позже заезда.");
      return;
    }
    const fn = cellGuestFirst.trim();
    const ln = cellGuestLast.trim();
    const em = cellGuestEmail.trim();
    const ph = cellGuestPhone.trim();
    if (fn === "" || ln === "") {
      setCellCreateError("Укажите имя и фамилию гостя.");
      return;
    }
    if (em === "" || ph === "") {
      setCellCreateError("Укажите email и телефон гостя.");
      return;
    }
    const passportTrim = cellGuestPassport.trim();
    const body: BookingCreateRequest = {
      property_id: selectedPropertyId,
      room_type_id: cellAction.room.room_type_id,
      rate_plan_id: cellRatePlanId,
      check_in: cellCheckIn,
      check_out: cellCheckOut,
      guest: {
        first_name: fn,
        last_name: ln,
        email: em,
        phone: ph,
        ...(passportTrim !== "" ? { passport_data: passportTrim } : {}),
      },
      status: "confirmed",
      source: "direct",
    };
    try {
      const res = await createBookingMut.mutateAsync(body);
      await patchBookingMut.mutateAsync({
        bookingId: res.booking_id,
        body: { room_id: cellAction.room.id },
      });
      setCellAction(null);
    } catch (err) {
      setCellCreateError(formatBoardCreateBookingError(err));
    }
  }

  function applyBlockCategoryNight(): void {
    setCellBlockError(null);
    if (cellAction === null) {
      return;
    }
    const key = `${cellAction.nightIso}_${cellAction.room.room_type_id}`;
    const cell = availabilityByKey.get(key);
    if (cell === undefined) {
      setCellBlockError(
        "Нет данных доступности на эту дату. Проверьте остатки в разделе «Тарифы»."
      );
      return;
    }
    blockInventoryMut.mutate({
      room_type_id: cellAction.room.room_type_id,
      start_date: cellAction.nightIso,
      end_date: cellAction.nightIso,
      blocked_rooms: cell.blocked_rooms + 1,
    });
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
                onEmptyCellClick={(payload) => {
                  setCellAction(payload);
                }}
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
        open={cellAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCellAction(null);
            setCellCreateError(null);
            setCellBlockError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {cellAction !== null
                ? `${cellAction.room.name} · ${cellAction.nightIso}`
                : "Ячейка"}
            </DialogTitle>
            <DialogDescription>
              Доступны действия для выбранной ночи и категории номера этой
              строки.
            </DialogDescription>
          </DialogHeader>
          {canWriteInventory ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm text-foreground">
                Снять с продажи слот категории (+1 к блокировкам в ночлеге)
              </p>
              <p className="text-xs text-muted-foreground">
                Действие относится к всей категории номера на эту дату, а не
                только к одной физическому номеру. Требуются права
                владельца/менеджера.
              </p>
              {cellBlockError !== null ? (
                <p className="text-sm text-destructive" role="alert">
                  {cellBlockError}
                </p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={blockInventoryMut.isPending || cellAction === null}
                onClick={applyBlockCategoryNight}
              >
                {blockInventoryMut.isPending
                  ? "Применяем…"
                  : "Заблокировать +1 в категории на эту ночь"}
              </Button>
            </div>
          ) : null}
          {canWriteBookings ? (
            <form className="space-y-4 pt-2" onSubmit={handleCellCreateBooking}>
              <p className="text-sm font-medium text-foreground">
                Новая бронь с назначением этого номера
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Заезд</span>
                  <Input
                    type="date"
                    value={cellCheckIn}
                    onChange={(e) => {
                      setCellCheckIn(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Выезд (эксклюзивно)</span>
                  <Input
                    type="date"
                    value={cellCheckOut}
                    onChange={(e) => {
                      setCellCheckOut(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Тариф</span>
                {ratePlansPending || (ratePlans !== undefined && ratePlans.length === 0) ? (
                  <p className="text-xs text-muted-foreground">
                    {ratePlansPending
                      ? "Загрузка тарифов…"
                      : "Нет тарифов — создайте в разделе «Тарифы»."}
                  </p>
                ) : (
                  <Select
                    value={cellRatePlanId}
                    onValueChange={(v) => {
                      setCellRatePlanId(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Тарифный план" />
                    </SelectTrigger>
                    <SelectContent>
                      {(ratePlans ?? []).map((rp) => (
                        <SelectItem key={rp.id} value={rp.id}>
                          {rp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="cell-g-fn" className="text-sm font-medium">
                    Имя
                  </label>
                  <Input
                    id="cell-g-fn"
                    value={cellGuestFirst}
                    onChange={(e) => {
                      setCellGuestFirst(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cell-g-ln" className="text-sm font-medium">
                    Фамилия
                  </label>
                  <Input
                    id="cell-g-ln"
                    value={cellGuestLast}
                    onChange={(e) => {
                      setCellGuestLast(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="cell-g-em" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="cell-g-em"
                    type="email"
                    autoComplete="email"
                    value={cellGuestEmail}
                    onChange={(e) => {
                      setCellGuestEmail(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cell-g-ph" className="text-sm font-medium">
                    Телефон
                  </label>
                  <Input
                    id="cell-g-ph"
                    type="tel"
                    value={cellGuestPhone}
                    onChange={(e) => {
                      setCellGuestPhone(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="cell-g-pp" className="text-sm font-medium">
                  Паспорт / примечание (необязательно)
                </label>
                <Input
                  id="cell-g-pp"
                  value={cellGuestPassport}
                  onChange={(e) => {
                    setCellGuestPassport(e.target.value);
                  }}
                />
              </div>
              {cellCreateError !== null ? (
                <p className="text-sm text-destructive" role="alert">
                  {cellCreateError}
                </p>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCellAction(null);
                  }}
                >
                  Закрыть
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createBookingMut.isPending ||
                    patchBookingMut.isPending ||
                    cellRatePlanId === "" ||
                    (ratePlans !== undefined && ratePlans.length === 0)
                  }
                >
                  {createBookingMut.isPending || patchBookingMut.isPending
                    ? "Создание…"
                    : "Создать и назначить номер"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
          {!canWriteBookings && !canWriteInventory ? (
            <p className="text-sm text-muted-foreground">
              Недостаточно прав для действий с этой ячейкой.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={summaryBooking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSummaryBooking(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {summaryBooking !== null
                ? `${summaryBooking.guest.last_name} ${summaryBooking.guest.first_name}`.trim()
                : "Бронь"}
            </DialogTitle>
            <DialogDescription>
              Краткие данные по выбранной брони на сетке.
            </DialogDescription>
          </DialogHeader>
          {summaryBooking !== null ? (
            <div className="space-y-1 py-2 text-sm">
              <p className="text-foreground">
                Статус:{" "}
                <span className="font-medium">{summaryBooking.status}</span>
              </p>
              <p className="tabular-nums text-muted-foreground">
                Заезд: {summaryBooking.check_in_date ?? "—"} · Выезд:{" "}
                {summaryBooking.check_out_date ?? "—"}
              </p>
              <p className="text-muted-foreground">
                Номер:{" "}
                {summaryBooking.room_id !== null
                  ? (roomNameById.get(summaryBooking.room_id) ?? "—")
                  : "—"}
              </p>
              <p className="text-muted-foreground">
                Категория:{" "}
                {summaryBooking.room_type_id !== null &&
                summaryBooking.room_type_id !== undefined
                  ? (roomTypeNameById.get(summaryBooking.room_type_id) ?? "—")
                  : "—"}
              </p>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSummaryBooking(null);
              }}
            >
              Закрыть
            </Button>
            {summaryBooking !== null && bookingMenuApi !== null ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={bookingMenuApi.patchIsPending}
                  onClick={() => {
                    const b = summaryBooking;
                    const api = bookingMenuApi;
                    setSummaryBooking(null);
                    api.openReschedule(b);
                  }}
                >
                  Перенос дат…
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const id = summaryBooking.id;
                    bookingMenuApi.openFolio(id);
                  }}
                >
                  Карточка / фолио
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
