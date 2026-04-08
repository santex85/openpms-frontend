import {
  closestCenter,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  bookingPatchTouchesStayDates,
  type BookingPatchBody,
  patchBooking,
} from "@/api/bookings";
import { fetchAssignableRooms } from "@/api/rooms";
import { putAvailabilityOverride } from "@/api/inventory";
import { BoardBookingSummaryDialog } from "@/components/board/BoardBookingSummaryDialog";
import { BoardGrid } from "@/components/board/BoardGrid";
import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { BoardSidebar } from "@/components/board/BoardSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import { useAssignableRooms } from "@/hooks/useAssignableRooms";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useAssignBookingRoom } from "@/hooks/useAssignBookingRoom";
import { useBookings } from "@/hooks/useBookings";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useCreateBooking } from "@/hooks/useCreateBooking";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import {
  bookingFromBoardDragData,
  parseRoomIdFromDndOver,
} from "@/lib/boardDnd";
import { formatApiError } from "@/lib/formatApiError";
import { toastInfo } from "@/lib/toast";
import { duplicateRoomNameKeys } from "@/lib/roomDuplicateNames";
import { useCanWriteBookings, useCanWriteInventory } from "@/hooks/useAuthz";
import { usePropertyStore } from "@/stores/property-store";
import type { AvailabilityCell } from "@/types/inventory";
import type { Booking, BookingCreateRequest, RoomRow } from "@/types/api";
import {
  type BoardRangeMode,
  boardLocaleFromI18n,
  formatBookingStayLocale,
  formatIsoDateLocal,
  getBoardRange,
  getWeekRange,
} from "@/utils/boardDates";
import { sumAvailableByDate } from "@/utils/inventoryAggregate";

interface PatchBookingMutateVariables {
  bookingId: string;
  body: BookingPatchBody;
}

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

function findBookingInBookingsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId: string
): Booking | undefined {
  const cached = queryClient.getQueriesData<Booking[]>({
    queryKey: ["bookings"],
  });
  for (const [, list] of cached) {
    if (!Array.isArray(list)) {
      continue;
    }
    const hit = list.find((b) => b.id === bookingId);
    if (hit !== undefined) {
      return hit;
    }
  }
  return undefined;
}

/** Apply PATCH fields to a cached row for instant grid updates; `total_amount` stays until refetch. */
function mergePatchBodyIntoBooking(
  base: Booking,
  body: BookingPatchBody
): Booking {
  const next: Booking = { ...base };
  if (Object.prototype.hasOwnProperty.call(body, "check_in")) {
    next.check_in_date = body.check_in ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "check_out")) {
    next.check_out_date = body.check_out ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "room_id")) {
    next.room_id = body.room_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    if (body.status != null && body.status.trim() !== "") {
      next.status = body.status;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    next.notes = body.notes;
  }
  return next;
}

/** Merges one booking into every cached tape list (useBookings "all" queries) so the grid updates without relying only on refetch timing. */
function syncBookingAcrossBookingsQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  booking: Booking,
  bookingId: string
): void {
  const queries = queryClient.getQueriesData<Booking[]>({
    queryKey: ["bookings"],
  });
  for (const [queryKey, data] of queries) {
    if (!Array.isArray(data)) {
      continue;
    }
    const key = queryKey as readonly unknown[];
    if (key[key.length - 1] !== "all") {
      continue;
    }
    const propertyId = key[2];
    const startIso = key[3];
    const endIso = key[4];
    if (
      typeof propertyId !== "string" ||
      typeof startIso !== "string" ||
      typeof endIso !== "string"
    ) {
      continue;
    }
    if (booking.property_id !== propertyId) {
      continue;
    }
    const inWindow = bookingOverlapsMonth(booking, startIso, endIso);
    const idx = data.findIndex((b) => b.id === bookingId);
    if (inWindow) {
      if (idx === -1) {
        queryClient.setQueryData(queryKey, [...data, booking]);
      } else {
        const nextArr = data.slice();
        nextArr[idx] = booking;
        queryClient.setQueryData(queryKey, nextArr);
      }
    } else if (idx !== -1) {
      queryClient.setQueryData(
        queryKey,
        data.filter((b) => b.id !== bookingId)
      );
    }
  }
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
    `${capitalizeGuestName(booking.guest.last_name)} ${capitalizeGuestName(booking.guest.first_name)}`.trim();
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
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [boardRangeMode, setBoardRangeMode] =
    useState<BoardRangeMode>("month");
  const [customFromIso, setCustomFromIso] = useState("");
  const [customToIso, setCustomToIso] = useState("");

  const range = useMemo(
    () =>
      getBoardRange(boardRangeMode, monthAnchor, customFromIso, customToIso),
    [boardRangeMode, monthAnchor, customFromIso, customToIso]
  );

  const narrowBoardStrip = useMediaQuery("(max-width: 479px)");
  const useWeekStepNav = narrowBoardStrip && boardRangeMode === "month";
  const dataRange = useMemo(() => {
    if (useWeekStepNav) {
      return getWeekRange(monthAnchor);
    }
    return range;
  }, [useWeekStepNav, monthAnchor, range]);

  const rangeTitle = useMemo(() => {
    const localeTag = boardLocaleFromI18n(i18n.language);
    if (boardRangeMode === "month") {
      if (useWeekStepNav) {
        return (
          formatBookingStayLocale(
            dataRange.startIso,
            dataRange.endIso,
            localeTag
          ) ?? `${dataRange.startIso} — ${dataRange.endIso}`
        );
      }
      const raw = new Intl.DateTimeFormat(localeTag, {
        month: "long",
        year: "numeric",
      }).format(monthAnchor);
      if (localeTag.startsWith("ru")) {
        return raw.replace(/\sГ\.\s*$/u, " г.");
      }
      return raw;
    }
    return (
      formatBookingStayLocale(
        dataRange.startIso,
        dataRange.endIso,
        localeTag
      ) ?? `${dataRange.startIso} — ${dataRange.endIso}`
    );
  }, [
    boardRangeMode,
    monthAnchor,
    dataRange.startIso,
    dataRange.endIso,
    useWeekStepNav,
    i18n.language,
  ]);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: rooms, isPending: roomsPending } = useRooms();
  const { data: bookingsRaw } = useBookings(
    dataRange.startIso,
    dataRange.endIso
  );
  const {
    data: availabilityGrid,
    isPending: availabilityPending,
    isError: availabilityError,
  } = useAvailabilityGrid(dataRange.startIso, dataRange.endIso);
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();
  const createBookingMut = useCreateBooking();

  const canWriteBookings = useCanWriteBookings();
  const canWriteInventory = useCanWriteInventory();

  const assignRoom = useAssignBookingRoom();

  /** Tracks booking ids already processed by client auto-room logic; reset when stay dates PATCH so reschedule can re-run. */
  const autoAssignHandledIdsRef = useRef<Set<string>>(new Set());
  const autoAssignScopeKeyRef = useRef<string>("");

  const [summaryBooking, setSummaryBooking] = useState<Booking | null>(null);

  const patchBookingMut = useMutation({
    mutationFn: ({ bookingId, body }: PatchBookingMutateVariables) =>
      patchBooking(bookingId, body),
    onSuccess: (_data, variables) => {
      if (bookingPatchTouchesStayDates(variables.body)) {
        autoAssignHandledIdsRef.current.delete(variables.bookingId);
        toastInfo(t("bookings.toastFolioAfterDateChange"));
      }

      const base = findBookingInBookingsCache(queryClient, variables.bookingId);
      let updated: Booking | undefined;
      if (base !== undefined) {
        updated = mergePatchBodyIntoBooking(base, variables.body);
        syncBookingAcrossBookingsQueries(
          queryClient,
          updated,
          variables.bookingId
        );
      }

      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "folio"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inventory", "availability"],
      });
      void queryClient.invalidateQueries({ queryKey: ["rooms", "assignable"] });

      if (updated !== undefined) {
        setSummaryBooking((prev) =>
          prev?.id === variables.bookingId ? updated : prev
        );
      }
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
  const cellNightIso = cellAction?.nightIso ?? "";
  const cellRoomIdForInit = cellAction?.room.id ?? "";
  const defaultCellRatePlanId = ratePlans?.[0]?.id ?? "";
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
  const [cellPickRoomId, setCellPickRoomId] = useState("");

  const assignableRoomsQuery = useAssignableRooms({
    propertyId: selectedPropertyId,
    roomTypeId: cellAction?.room.room_type_id ?? null,
    checkIn: cellCheckIn,
    checkOut: cellCheckOut,
    ratePlanId: cellRatePlanId,
    enabled: cellAction !== null && canWriteBookings,
  });

  useEffect(() => {
    if (rescheduleBooking === null) {
      return;
    }
    setRescheduleCheckIn(rescheduleBooking.check_in_date ?? "");
    setRescheduleCheckOut(rescheduleBooking.check_out_date ?? "");
  }, [rescheduleBooking]);

  const assignableRoomIdsKey = useMemo(() => {
    const d = assignableRoomsQuery.data;
    if (d === undefined) {
      return "__pending__";
    }
    if (d.length === 0) {
      return "__empty__";
    }
    return [...d]
      .map((r) => r.id)
      .sort()
      .join("|");
  }, [assignableRoomsQuery.data]);

  useEffect(() => {
    if (cellNightIso === "" || cellRoomIdForInit === "") {
      return;
    }
    setCellCheckIn(cellNightIso);
    setCellCheckOut(addOneDayIso(cellNightIso));
    setCellCreateError(null);
    setCellBlockError(null);
    setCellGuestFirst("");
    setCellGuestLast("");
    setCellGuestEmail("");
    setCellGuestPhone("");
    setCellGuestPassport("");
    setCellRatePlanId(defaultCellRatePlanId);
    setCellPickRoomId(cellRoomIdForInit);
  }, [cellNightIso, cellRoomIdForInit, defaultCellRatePlanId]);

  useEffect(() => {
    if (cellNightIso === "" || cellRoomIdForInit === "") {
      return;
    }
    if (assignableRoomIdsKey === "__pending__") {
      return;
    }
    if (assignableRoomIdsKey === "__empty__") {
      setCellPickRoomId("");
      return;
    }
    const list = assignableRoomsQuery.data ?? [];
    const ids = new Set(list.map((r) => r.id));
    setCellPickRoomId((prev) => {
      if (prev !== "" && ids.has(prev)) {
        return prev;
      }
      if (list.length > 0) {
        return list[0].id;
      }
      return "";
    });
  }, [cellNightIso, cellRoomIdForInit, assignableRoomIdsKey, assignableRoomsQuery.data]);

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
    () => new Set(dataRange.days.map((d) => d.iso)),
    [dataRange.days]
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
        b.property_id === selectedPropertyId &&
        bookingOverlapsMonth(b, dataRange.startIso, dataRange.endIso)
    );
  }, [bookingsRaw, selectedPropertyId, dataRange.startIso, dataRange.endIso]);

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
        bookingOverlapsMonth(b, dataRange.startIso, dataRange.endIso)
    );
  }, [bookingsRaw, selectedPropertyId, dataRange.startIso, dataRange.endIso]);

  const unassignedByRoomTypeId = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of unassignedBookings) {
      const rtId = b.room_type_id;
      if (rtId === null || rtId === undefined) {
        continue;
      }
      const list = m.get(rtId) ?? [];
      list.push(b);
      m.set(rtId, list);
    }
    return m;
  }, [unassignedBookings]);

  /** Stable key of unassigned bookings eligible for client auto-room (same filters as assignable-rooms flow). */
  const unassignedAutoAssignCandidatesKey = useMemo(() => {
    if (selectedPropertyId === null || bookingsRaw === undefined) {
      return "";
    }
    return bookingsRaw
      .filter(
        (b) =>
          b.property_id === selectedPropertyId &&
          b.room_id === null &&
          b.check_in_date !== null &&
          b.check_out_date !== null &&
          b.room_type_id !== null &&
          b.room_type_id !== undefined &&
          bookingOverlapsMonth(b, dataRange.startIso, dataRange.endIso)
      )
      .map((b) => b.id)
      .sort()
      .join(",");
  }, [
    bookingsRaw,
    selectedPropertyId,
    dataRange.startIso,
    dataRange.endIso,
  ]);

  useEffect(() => {
    const scopeKey = `${selectedPropertyId ?? ""}|${dataRange.startIso}|${dataRange.endIso}`;
    if (autoAssignScopeKeyRef.current !== scopeKey) {
      autoAssignScopeKeyRef.current = scopeKey;
      autoAssignHandledIdsRef.current = new Set();
    }
  }, [selectedPropertyId, dataRange.startIso, dataRange.endIso]);

  useEffect(() => {
    if (!canWriteBookings || selectedPropertyId === null) {
      return;
    }
    if (bookingsRaw === undefined || unassignedAutoAssignCandidatesKey === "") {
      return;
    }

    const candidates = bookingsRaw
      .filter(
        (b) =>
          b.property_id === selectedPropertyId &&
          b.room_id === null &&
          b.check_in_date !== null &&
          b.check_out_date !== null &&
          b.room_type_id !== null &&
          b.room_type_id !== undefined &&
          bookingOverlapsMonth(b, dataRange.startIso, dataRange.endIso)
      )
      .sort((a, b) => a.id.localeCompare(b.id));

    const pending = candidates.filter(
      (b) => !autoAssignHandledIdsRef.current.has(b.id)
    );
    if (pending.length === 0) {
      return;
    }

    let skipInvalidation = false;
    const localeTag = boardLocaleFromI18n(i18n.language);

    void (async () => {
      for (const b of pending) {
        if (autoAssignHandledIdsRef.current.has(b.id)) {
          continue;
        }
        autoAssignHandledIdsRef.current.add(b.id);
        try {
          const assignable = await fetchAssignableRooms({
            propertyId: selectedPropertyId,
            roomTypeId: b.room_type_id!,
            checkIn: b.check_in_date!,
            checkOut: b.check_out_date!,
          });
          const ordered = [...assignable].sort((a, b) =>
            a.name.localeCompare(b.name, localeTag, { sensitivity: "base" })
          );
          if (ordered.length === 0) {
            continue;
          }
          await patchBooking(b.id, { room_id: ordered[0].id });
          if (!skipInvalidation) {
            void queryClient.invalidateQueries({ queryKey: ["bookings"] });
            void queryClient.invalidateQueries({
              queryKey: ["rooms", "assignable"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["inventory", "availability"],
            });
          }
        } catch (err) {
          console.error("BoardPage: auto-assign room failed", b.id, err);
        }
      }
    })();

    return () => {
      skipInvalidation = true;
    };
  }, [
    bookingsRaw,
    canWriteBookings,
    selectedPropertyId,
    dataRange.startIso,
    dataRange.endIso,
    unassignedAutoAssignCandidatesKey,
    i18n.language,
    queryClient,
  ]);

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

  const roomDuplicateKeys = useMemo(
    () => duplicateRoomNameKeys(rooms ?? []),
    [rooms]
  );

  const summaryRoomName = useMemo(() => {
    if (summaryBooking === null || summaryBooking.room_id === null) {
      return null;
    }
    return roomNameById.get(summaryBooking.room_id) ?? null;
  }, [summaryBooking, roomNameById]);

  const summaryRoomTypeName = useMemo(() => {
    if (
      summaryBooking === null ||
      summaryBooking.room_type_id === null ||
      summaryBooking.room_type_id === undefined
    ) {
      return null;
    }
    return roomTypeNameById.get(summaryBooking.room_type_id) ?? null;
  }, [summaryBooking, roomTypeNameById]);

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

  /** Sends current `room_id` with dates so the API can keep assignment when stay moves. */
  async function applyReschedule(): Promise<void> {
    if (rescheduleBooking === null) {
      return;
    }
    const rid = rescheduleBooking.room_id;
    try {
      await patchBookingMut.mutateAsync({
        bookingId: rescheduleBooking.id,
        body: {
          check_in: rescheduleCheckIn,
          check_out: rescheduleCheckOut,
          ...(rid !== null && rid !== undefined ? { room_id: rid } : {}),
        },
      });
      setRescheduleBooking(null);
    } catch (e) {
      setBoardMessage(formatApiError(e));
    }
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
    if (cellPickRoomId === "") {
      setCellCreateError(
        "Выберите номер или измените даты — нет свободных номеров этой категории."
      );
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
        body: { room_id: cellPickRoomId },
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
      <BoardSidebar
        rangeTitle={rangeTitle}
        boardRangeMode={boardRangeMode}
        onBoardRangeModeChange={setBoardRangeMode}
        monthAnchor={monthAnchor}
        onMonthAnchorChange={(d) => {
          setMonthAnchor(d);
        }}
        useWeekStepNav={useWeekStepNav}
        customFromIso={customFromIso}
        customToIso={customToIso}
        onCustomFromIsoChange={setCustomFromIso}
        onCustomToIsoChange={setCustomToIso}
        canWriteBookings={canWriteBookings}
      />

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
        <BoardGrid
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
          boardMessage={boardMessage}
          assignRoomError={assignRoom.isError}
          assignRoomErrorObj={assignRoom.error}
          patchBookingError={patchBookingMut.isError}
          patchBookingErrorObj={patchBookingMut.error}
          sortedRoomTypes={sortedRoomTypes}
          unassignedByRoomTypeId={unassignedByRoomTypeId}
          days={dataRange.days}
          rooms={rooms ?? []}
          bookingsForGrid={bookingsForGrid}
          sumsByDate={sumsByDate}
          showAvailabilityPending={showAvailabilityPending}
          availabilityError={availabilityError}
          roomDuplicateKeys={roomDuplicateKeys}
          bookingMenuApi={bookingMenuApi}
          onEmptyCellClick={(payload) => {
            setCellAction(payload);
          }}
          dragOverlayBooking={activeBooking}
          renderDragOverlay={(booking) => (
            <DragOverlayCard booking={booking} />
          )}
        />
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
          {canWriteInventory && !canWriteBookings ? (
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
                {blockInventoryMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
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
                  <DatePickerField
                    value={cellCheckIn}
                    onChange={setCellCheckIn}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Выезд (эксклюзивно)</span>
                  <DatePickerField
                    value={cellCheckOut}
                    onChange={setCellCheckOut}
                    min={cellCheckIn.trim() || undefined}
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
              {cellRatePlanId !== "" ? (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Номер</span>
                  {assignableRoomsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Подбор свободных номеров на выбранные даты…
                    </p>
                  ) : assignableRoomsQuery.isError ? (
                    <p className="text-xs text-destructive" role="alert">
                      {formatApiError(assignableRoomsQuery.error)}
                    </p>
                  ) : (assignableRoomsQuery.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Нет свободных номеров этой категории на эти даты. Измените
                      даты или проверьте загрузку.
                    </p>
                  ) : (
                    <Select
                      value={cellPickRoomId}
                      onValueChange={setCellPickRoomId}
                    >
                      <SelectTrigger aria-label="Номер для брони">
                        <SelectValue placeholder="Номер" />
                      </SelectTrigger>
                      <SelectContent>
                        {(assignableRoomsQuery.data ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {cellAction !== null &&
                  assignableRoomsQuery.data !== undefined &&
                  !assignableRoomsQuery.data.some(
                    (r) => r.id === cellAction.room.id
                  ) ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Номер строки («{cellAction.room.name}») занят на эти даты —
                      выберите другой.
                    </p>
                  ) : null}
                </div>
              ) : null}
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
                    cellPickRoomId === "" ||
                    (cellRatePlanId !== "" && assignableRoomsQuery.isLoading) ||
                    assignableRoomsQuery.isError ||
                    (ratePlans !== undefined && ratePlans.length === 0)
                  }
                >
                  {createBookingMut.isPending || patchBookingMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
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

      <BoardBookingSummaryDialog
        booking={summaryBooking}
        open={summaryBooking !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSummaryBooking(null);
          }
        }}
        roomName={summaryRoomName}
        roomTypeName={summaryRoomTypeName}
        canWriteBookings={canWriteBookings}
        patchIsPending={patchBookingMut.isPending}
        onPatch={(bookingId, body) => {
          setBoardMessage(null);
          patchBookingMut.mutate(
            { bookingId, body },
            {
              onError: (e) => {
                setBoardMessage(formatApiError(e));
              },
            }
          );
        }}
        onReschedule={(b) => {
          if (bookingMenuApi !== null) {
            bookingMenuApi.openReschedule(b);
          }
        }}
        onGoToBooking={(id) => {
          navigate(`/bookings/${id}`);
          setSummaryBooking(null);
        }}
      />

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
              <DatePickerField
                id="res-ci"
                value={rescheduleCheckIn}
                onChange={setRescheduleCheckIn}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="res-co" className="text-sm font-medium">
                Выезд (check_out, эксклюзивно)
              </label>
              <DatePickerField
                id="res-co"
                value={rescheduleCheckOut}
                onChange={setRescheduleCheckOut}
                min={rescheduleCheckIn.trim() || undefined}
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
              {patchBookingMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
