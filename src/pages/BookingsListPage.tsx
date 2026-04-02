import { useVirtualizer } from "@tanstack/react-virtual";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useBookings } from "@/hooks/useBookings";
import { useCreateBooking } from "@/hooks/useCreateBooking";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
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
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { PageTableSkeleton } from "@/components/ui/page-table-skeleton";
import { bookingStatusFilterItems, bookingStatusLabel } from "@/lib/i18n/domainLabels";
import { formatApiError } from "@/lib/formatApiError";
import { useCanWriteBookings } from "@/hooks/useAuthz";
import { usePropertyStore } from "@/stores/property-store";
import type { Booking, BookingCreateRequest } from "@/types/api";
import { formatIsoDateLocal } from "@/utils/boardDates";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatCreateBookingError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    const detail = data.detail;
    if (typeof detail === "object" && detail !== null && "missing_dates" in detail) {
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

const BOOKINGS_PAGE_SIZE = 25;

export function BookingsListPage() {
  const navigate = useNavigate();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const canCreateBooking = useCanWriteBookings();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [localSearch, setLocalSearch] = useState("");

  const range = useMemo(() => {
    const end = new Date();
    const start = addDays(end, -90);
    return {
      startIso: formatIsoDateLocal(start),
      endIso: formatIsoDateLocal(end),
    };
  }, []);

  const listOptions = useMemo(
    () => ({
      page,
      pageSize: BOOKINGS_PAGE_SIZE,
      ...(statusFilter !== "" ? { status: statusFilter } : {}),
    }),
    [page, statusFilter]
  );

  const { data: tape, isPending, isError, error: bookingsError } =
    useBookings(range.startIso, range.endIso, listOptions);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();
  const createBookingMutation = useCreateBooking();

  const [createOpen, setCreateOpen] = useState(false);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [ratePlanId, setRatePlanId] = useState("");
  const [checkIn, setCheckIn] = useState(() => formatIsoDateLocal(new Date()));
  const [checkOut, setCheckOut] = useState(() =>
    formatIsoDateLocal(addDays(new Date(), 1))
  );
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPassport, setGuestPassport] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBanner, setCreateBanner] = useState<{
    id: string;
    total: string;
  } | null>(null);

  useEffect(() => {
    if (
      roomTypes !== undefined &&
      roomTypes.length > 0 &&
      !roomTypes.some((r) => r.id === roomTypeId)
    ) {
      setRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypes, roomTypeId]);

  useEffect(() => {
    if (
      ratePlans !== undefined &&
      ratePlans.length > 0 &&
      !ratePlans.some((r) => r.id === ratePlanId)
    ) {
      setRatePlanId(ratePlans[0].id);
    }
  }, [ratePlans, ratePlanId]);

  const rows = useMemo<Booking[]>(() => tape?.items ?? [], [tape?.items]);
  const total = tape?.total ?? 0;

  const filteredRows = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (q === "") {
      return rows;
    }
    return rows.filter((b) => {
      const guestBlob =
        `${b.guest.first_name} ${b.guest.last_name}`.toLowerCase();
      return (
        guestBlob.includes(q) ||
        b.id.toLowerCase().includes(q) ||
        bookingStatusLabel(b.status).toLowerCase().includes(q) ||
        (b.check_in_date ?? "").includes(q) ||
        (b.check_out_date ?? "").includes(q)
      );
    });
  }, [rows, localSearch]);

  const bookingsScrollRef = useRef<HTMLDivElement>(null);
  const bookingsVirtual = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => bookingsScrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  function resetCreateFormDefaults(): void {
    setCheckIn(formatIsoDateLocal(new Date()));
    setCheckOut(formatIsoDateLocal(addDays(new Date(), 1)));
    setGuestFirst("");
    setGuestLast("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestPassport("");
    setCreateError(null);
  }

  async function handleCreateBooking(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setCreateError(null);

    if (selectedPropertyId === null) {
      setCreateError("Выберите отель в шапке.");
      return;
    }
    if (roomTypeId === "" || ratePlanId === "") {
      setCreateError("Выберите тип номера и тарифный план.");
      return;
    }
    if (checkOut <= checkIn) {
      setCreateError("Дата выезда должна быть позже заезда.");
      return;
    }

    const fn = guestFirst.trim();
    const ln = guestLast.trim();
    const em = guestEmail.trim();
    const ph = guestPhone.trim();
    if (fn === "" || ln === "") {
      setCreateError("Укажите имя и фамилию гостя.");
      return;
    }
    if (em === "" || ph === "") {
      setCreateError("Укажите email и телефон гостя.");
      return;
    }

    const passportTrim = guestPassport.trim();
    const body: BookingCreateRequest = {
      property_id: selectedPropertyId,
      room_type_id: roomTypeId,
      rate_plan_id: ratePlanId,
      check_in: checkIn,
      check_out: checkOut,
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
      const res = await createBookingMutation.mutateAsync(body);
      setCreateBanner({
        id: res.booking_id,
        total: res.total_amount,
      });
      setCreateOpen(false);
      resetCreateFormDefaults();
    } catch (err) {
      setCreateError(formatCreateBookingError(err));
    }
  }

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Выберите отель в шапке.
      </p>
    );
  }

  const plansReady = !ratePlansPending && ratePlans !== undefined;
  const typesReady = !roomTypesPending && roomTypes !== undefined;
  const hasRoomTypes = typesReady && roomTypes.length > 0;
  const hasRatePlans = plansReady && ratePlans.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Бронирования</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Последние 90 дней по выбранному отелю. Фильтр статуса и страницы — на
            стороне API. Поиск ниже действует только на текущую страницу (
            временная мера, пока нет поиска на бэке).
          </p>
        </div>
        {canCreateBooking ? (
          <Button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateBanner(null);
              resetCreateFormDefaults();
              setCreateOpen(true);
            }}
          >
            Новое бронирование
          </Button>
        ) : null}
      </div>

      {createBanner !== null ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Бронь создана. Сумма: {createBanner.total}.{" "}
          <Link
            to={`/bookings/${createBanner.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Открыть карточку
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Статус
          </span>
          <Select
            value={statusFilter === "" ? "__all__" : statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v === "__all__" ? "" : v);
            }}
          >
            <SelectTrigger className="w-[220px]" aria-label="Фильтр статуса">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все</SelectItem>
              {bookingStatusFilterItems().map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex max-w-md flex-1 flex-col gap-1">
          <label
            htmlFor="bookings-local-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Поиск по текущей странице
          </label>
          <Input
            id="bookings-local-search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
            }}
            placeholder="Гость, даты, фрагмент id…"
            autoComplete="off"
          />
        </div>
      </div>

      {!isPending && !isError ? (
        <Pagination
          className="rounded-md border border-border bg-muted/20 px-3 py-2"
          total={total}
          limit={BOOKINGS_PAGE_SIZE}
          offset={page * BOOKINGS_PAGE_SIZE}
          onPageChange={(newOffset) => {
            setPage(Math.floor(newOffset / BOOKINGS_PAGE_SIZE));
          }}
        />
      ) : null}
      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          Не удалось загрузить брони.
          {bookingsError !== null ? ` ${formatApiError(bookingsError)}` : ""}
        </p>
      ) : isPending ? (
        <PageTableSkeleton rows={7} cols={5} />
      ) : (
        <div
          ref={bookingsScrollRef}
          className="max-h-[min(520px,65vh)] overflow-auto rounded-md border border-border"
        >
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Гость</th>
                <th className="w-[9rem] px-3 py-2 font-medium">Статус</th>
                <th className="w-[7rem] px-3 py-2 font-medium">Заезд</th>
                <th className="w-[7rem] px-3 py-2 font-medium">Выезд</th>
                <th className="w-[6rem] px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody
              className="relative"
              style={{
                height:
                  filteredRows.length === 0
                    ? undefined
                    : `${bookingsVirtual.getTotalSize()}px`,
              }}
            >
              {filteredRows.length === 0
                ? null
                : bookingsVirtual.getVirtualItems().map((vi) => {
                    const b = filteredRows[vi.index];
                    return (
                      <tr
                        key={b.id}
                        tabIndex={0}
                        className="absolute left-0 table w-full cursor-pointer border-b border-border/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          transform: `translateY(${vi.start}px)`,
                          height: `${vi.size}px`,
                        }}
                        onClick={() => {
                          navigate(`/bookings/${b.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            navigate(`/bookings/${b.id}`);
                          }
                        }}
                      >
                        <td className="px-3 py-2 align-middle">
                          {b.guest.last_name} {b.guest.first_name}
                        </td>
                        <td className="px-3 py-2 align-middle tabular-nums text-muted-foreground">
                          {bookingStatusLabel(b.status)}
                        </td>
                        <td className="px-3 py-2 align-middle tabular-nums">
                          {b.check_in_date ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-middle tabular-nums">
                          {b.check_out_date ?? "—"}
                        </td>
                        <td
                          className="px-3 py-2 text-right align-middle"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/bookings/${b.id}`}>Открыть</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Нет записей.</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Нет совпадений на этой странице — сбросьте поиск или смените
              страницу.
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новое бронирование</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>
                Нужны тип номера, тариф и цены на все ночи по выбранным датам.
              </span>
              <ApiRouteHint>POST /bookings</ApiRouteHint>
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => void handleCreateBooking(e)}
          >
            {createError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {createError}
              </p>
            ) : null}
            {!hasRoomTypes ? (
              <p className="text-sm text-muted-foreground">
                Нет категорий номеров. Создайте тип в{" "}
                <Link
                  to="/settings#room-types-hint"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  настройках
                </Link>
                .
              </p>
            ) : null}
            {!hasRatePlans ? (
              <p className="text-sm text-muted-foreground">
                Нет тарифных планов. Добавьте в{" "}
                <Link
                  to="/rates"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  разделе «Тарифы»
                </Link>
                .
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">Тип номера</span>
                <Select
                  value={roomTypeId}
                  onValueChange={setRoomTypeId}
                  disabled={!hasRoomTypes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes?.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">Тарифный план</span>
                <Select
                  value={ratePlanId}
                  onValueChange={setRatePlanId}
                  disabled={!hasRatePlans}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="План" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratePlans?.map((rp) => (
                      <SelectItem key={rp.id} value={rp.id}>
                        {rp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-check-in" className="text-sm font-medium">
                  Заезд
                </label>
                <DatePickerField
                  id="bk-check-in"
                  value={checkIn}
                  onChange={setCheckIn}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-check-out" className="text-sm font-medium">
                  Выезд
                </label>
                <DatePickerField
                  id="bk-check-out"
                  value={checkOut}
                  onChange={setCheckOut}
                  min={checkIn.trim() || undefined}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-guest-first" className="text-sm font-medium">
                  Имя
                </label>
                <Input
                  id="bk-guest-first"
                  value={guestFirst}
                  onChange={(e) => {
                    setGuestFirst(e.target.value);
                  }}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-guest-last" className="text-sm font-medium">
                  Фамилия
                </label>
                <Input
                  id="bk-guest-last"
                  value={guestLast}
                  onChange={(e) => {
                    setGuestLast(e.target.value);
                  }}
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="bk-guest-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="bk-guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                  }}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="bk-guest-phone" className="text-sm font-medium">
                  Телефон
                </label>
                <Input
                  id="bk-guest-phone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(e.target.value);
                  }}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="bk-guest-passport"
                  className="text-sm font-medium"
                >
                  Паспорт / ID (необязательно)
                </label>
                <Input
                  id="bk-guest-passport"
                  value={guestPassport}
                  onChange={(e) => {
                    setGuestPassport(e.target.value);
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  createBookingMutation.isPending ||
                  !hasRoomTypes ||
                  !hasRatePlans
                }
              >
                {createBookingMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {createBookingMutation.isPending
                  ? "Создаём…"
                  : "Создать бронь"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
