import { useVirtualizer } from "@tanstack/react-virtual";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { TaxBreakdown } from "@/components/bookings/TaxBreakdown";
import { taxRulesToPreviewLines } from "@/lib/countryPackTaxRules";
import { useBookings } from "@/hooks/useBookings";
import { useCountryPackDetail } from "@/hooks/useCountryPacks";
import { useCreateBooking } from "@/hooks/useCreateBooking";
import { useNightlyRates } from "@/hooks/useNightlyRates";
import { useProperties } from "@/hooks/useProperties";
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
import { bookingDisplayHash } from "@/lib/bookingDisplay";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import {
  bookingStatusFilterItems,
  bookingSummaryBadgeLabel,
  bookingSummaryStatusBadgeClass,
} from "@/lib/i18n/domainLabels";
import { formatApiError } from "@/lib/formatApiError";
import { formatMoneyAmount } from "@/lib/formatMoney";
import { toastInfo } from "@/lib/toast";
import { useCanWriteBookings } from "@/hooks/useAuthz";
import { usePropertyStore } from "@/stores/property-store";
import type { Booking, BookingCreateRequest } from "@/types/api";
import { formatIsoDateLocal } from "@/utils/boardDates";
import { formatShortLocaleDate } from "@/utils/formatLocaleDate";
import { cn } from "@/lib/utils";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatCreateBookingError(
  err: unknown,
  t: (k: string, o?: Record<string, string | number>) => string
): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    const detail = data.detail;
    if (typeof detail === "object" && detail !== null && "missing_dates" in detail) {
      const md = (detail as { missing_dates: unknown }).missing_dates;
      if (Array.isArray(md)) {
        return t("bookings.err.ratesMissing", {
          dates: md.map(String).join(", "),
        });
      }
    }
    if (err.response.status === 409) {
      return t("bookings.err.conflictRooms");
    }
  }
  return formatApiError(err);
}

const BOOKINGS_PAGE_SIZE = 25;

function sumStayRates(
  rates: { date: string; price: string }[],
  checkIn: string,
  checkOut: string
): number {
  let sum = 0;
  for (const r of rates) {
    if (r.date >= checkIn && r.date < checkOut) {
      const p = Number.parseFloat(r.price);
      if (Number.isFinite(p)) {
        sum += p;
      }
    }
  }
  return sum;
}

/** Absolute virtual rows break sync with table-fixed headers; shared grid keeps columns aligned. */
const BOOKINGS_LIST_ROW_GRID =
  "grid w-full grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_6rem]";

export function BookingsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const countryPackCode = usePropertyStore((s) => s.countryPackCode);
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
      searchInput: localSearch,
    }),
    [page, statusFilter, localSearch]
  );

  const { data: tape, isPending, isError, error: bookingsError } =
    useBookings(range.startIso, range.endIso, listOptions);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();
  const { data: properties } = useProperties();
  const propertyRow = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return undefined;
    }
    return properties.find((p) => p.id === selectedPropertyId);
  }, [selectedPropertyId, properties]);
  const { data: packDetail } = useCountryPackDetail(countryPackCode);
  const bookingTaxPreviewLines = useMemo(
    () => taxRulesToPreviewLines(packDetail?.taxes),
    [packDetail?.taxes]
  );

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
  const [bookingSource, setBookingSource] = useState<string>("direct");
  const [guestsCount, setGuestsCount] = useState<string>("2");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBanner, setCreateBanner] = useState<{
    id: string;
    total: string;
    guestMerged?: boolean;
  } | null>(null);

  const { data: nightlyRates } = useNightlyRates(
    roomTypeId !== "" ? roomTypeId : null,
    ratePlanId !== "" ? ratePlanId : null,
    checkIn,
    checkOut
  );
  const priceSubtotal = useMemo(() => {
    if (nightlyRates === undefined || checkOut <= checkIn) {
      return null;
    }
    const n = sumStayRates(nightlyRates, checkIn, checkOut);
    return n > 0 ? n : null;
  }, [nightlyRates, checkIn, checkOut]);

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

  const selectedRoomType = useMemo(() => {
    if (roomTypeId === "" || roomTypes === undefined) {
      return undefined;
    }
    return roomTypes.find((r) => r.id === roomTypeId);
  }, [roomTypeId, roomTypes]);

  useEffect(() => {
    if (selectedRoomType === undefined) {
      return;
    }
    const max = selectedRoomType.max_occupancy;
    setGuestsCount((prev) => {
      const n = Number.parseInt(prev, 10);
      if (!Number.isFinite(n) || n < 1) {
        return "1";
      }
      if (n > max) {
        return String(max);
      }
      return prev;
    });
  }, [selectedRoomType]);

  const rows = useMemo<Booking[]>(() => tape?.items ?? [], [tape?.items]);
  const total = tape?.total ?? 0;

  const bookingsScrollRef = useRef<HTMLDivElement>(null);
  const bookingsVirtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => bookingsScrollRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  useEffect(() => {
    setPage(0);
  }, [statusFilter, localSearch]);

  function resetCreateFormDefaults(): void {
    setCheckIn(formatIsoDateLocal(new Date()));
    setCheckOut(formatIsoDateLocal(addDays(new Date(), 1)));
    setGuestFirst("");
    setGuestLast("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestPassport("");
    setBookingSource("direct");
    setGuestsCount("2");
    setCreateError(null);
  }

  async function handleCreateBooking(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setCreateError(null);

    if (selectedPropertyId === null) {
      setCreateError(t("bookings.err.selectProperty"));
      return;
    }
    if (roomTypeId === "" || ratePlanId === "") {
      setCreateError(t("bookings.err.roomAndRate"));
      return;
    }
    if (checkOut <= checkIn) {
      setCreateError(t("bookings.err.dates"));
      return;
    }

    const fn = guestFirst.trim();
    const ln = guestLast.trim();
    const em = guestEmail.trim();
    const ph = guestPhone.trim();
    if (fn === "" || ln === "") {
      setCreateError(t("bookings.err.names"));
      return;
    }
    if (em === "" || ph === "") {
      setCreateError(t("bookings.err.contact"));
      return;
    }

    const gc = Number.parseInt(guestsCount, 10);
    const maxOcc = selectedRoomType?.max_occupancy ?? 99;
    if (!Number.isFinite(gc) || gc < 1) {
      setCreateError(t("bookings.err.guestsCount"));
      return;
    }
    if (gc > maxOcc) {
      setCreateError(
        t("bookings.err.guestsCountMax", { max: String(maxOcc) })
      );
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
      source: bookingSource,
      guests_count: gc,
    };

    try {
      const res = await createBookingMutation.mutateAsync(body);
      setCreateBanner({
        id: res.booking_id,
        total: res.total_amount,
        guestMerged: res.guest_merged === true,
      });
      if (res.guest_merged === true) {
        toastInfo(t("bookings.toastGuestMerged"));
      }
      setCreateOpen(false);
      resetCreateFormDefaults();
    } catch (err) {
      setCreateError(formatCreateBookingError(err, t));
    }
  }

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">{t("bookings.pickProperty")}</p>
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
          <h2 className="text-lg font-semibold text-foreground">
            {t("bookings.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("bookings.hint")}</p>
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
            {t("bookings.new")}
          </Button>
        ) : null}
      </div>

      {createBanner !== null ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {t("bookings.createdBanner", { total: createBanner.total })}{" "}
          {createBanner.guestMerged === true ? (
            <span className="ml-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {t("bookings.badgeLinked")}
            </span>
          ) : null}{" "}
          <Link
            to={`/bookings/${createBanner.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("bookings.openCard")}
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("bookings.statusFilter")}
          </span>
          <Select
            value={statusFilter === "" ? "__all__" : statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v === "__all__" ? "" : v);
            }}
          >
            <SelectTrigger
              className="w-[220px]"
              aria-label={t("bookings.statusAria")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("common.all")}</SelectItem>
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
            {t("bookings.searchLabel")}
          </label>
          <Input
            id="bookings-local-search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
            }}
            placeholder={t("bookings.searchPlaceholder")}
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
          {t("bookings.loadError")}
          {bookingsError !== null ? ` ${formatApiError(bookingsError)}` : ""}
        </p>
      ) : isPending ? (
        <PageTableSkeleton rows={7} cols={5} />
      ) : (
        <div
          ref={bookingsScrollRef}
          className="max-h-[min(520px,65vh)] overflow-auto rounded-md border border-border"
        >
          <div className="min-w-[640px] text-left text-sm">
            <div
              className={`${BOOKINGS_LIST_ROW_GRID} sticky top-0 z-10 border-b border-border bg-muted/50`}
            >
              <div className="px-3 py-2 font-medium">{t("bookings.colGuest")}</div>
              <div className="px-3 py-2 font-medium">{t("bookings.colStatus")}</div>
              <div className="px-3 py-2 font-medium">{t("bookings.colCheckIn")}</div>
              <div className="px-3 py-2 font-medium">{t("bookings.colCheckOut")}</div>
              <div className="px-3 py-2 font-medium" aria-hidden />
            </div>
            <div
              className="relative"
              style={{
                height:
                  rows.length === 0
                    ? undefined
                    : `${bookingsVirtual.getTotalSize()}px`,
              }}
            >
              {rows.length === 0
                ? null
                : bookingsVirtual.getVirtualItems().map((vi) => {
                    const b = rows[vi.index];
                    return (
                      <div
                        key={b.id}
                        tabIndex={0}
                        role="button"
                        className={`${BOOKINGS_LIST_ROW_GRID} absolute left-0 cursor-pointer items-center border-b border-border/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        style={{
                          transform: `translateY(${vi.start}px)`,
                          height: `${vi.size}px`,
                        }}
                        onClick={() => {
                          navigate(`/bookings/${b.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/bookings/${b.id}`);
                          }
                        }}
                      >
                        <div className="min-w-0 px-3 py-2 align-middle">
                          <span className="block truncate">
                            {capitalizeGuestName(b.guest.last_name)}{" "}
                            {capitalizeGuestName(b.guest.first_name)}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                            #{bookingDisplayHash(b.id)}
                          </span>
                        </div>
                        <div className="px-3 py-2 align-middle">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                              bookingSummaryStatusBadgeClass(b.status)
                            )}
                          >
                            {bookingSummaryBadgeLabel(b.status)}
                          </span>
                        </div>
                        <div className="px-3 py-2 align-middle tabular-nums">
                          {formatShortLocaleDate(
                            b.check_in_date,
                            i18n.language
                          )}
                        </div>
                        <div className="px-3 py-2 align-middle tabular-nums">
                          {formatShortLocaleDate(
                            b.check_out_date,
                            i18n.language
                          )}
                        </div>
                        <div
                          className="px-3 py-2 text-right align-middle"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/bookings/${b.id}`}>{t("common.open")}</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("bookings.empty")}</p>
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
            <DialogTitle>{t("bookings.dialogTitle")}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>{t("bookings.dialogHint")}</span>
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
                <Trans
                  i18nKey="bookings.noRoomTypes"
                  components={{
                    l: (
                      <Link
                        to="/settings#room-types-hint"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      />
                    ),
                  }}
                />
              </p>
            ) : null}
            {!hasRatePlans ? (
              <p className="text-sm text-muted-foreground">
                <Trans
                  i18nKey="bookings.noRatePlans"
                  components={{
                    r: (
                      <Link
                        to="/rates"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      />
                    ),
                  }}
                />
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">
                  {t("bookings.form.roomType")}
                </span>
                <Select
                  value={roomTypeId}
                  onValueChange={setRoomTypeId}
                  disabled={!hasRoomTypes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("bookings.form.roomTypePh")} />
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
                <span className="text-sm font-medium">
                  {t("bookings.form.ratePlan")}
                </span>
                <Select
                  value={ratePlanId}
                  onValueChange={setRatePlanId}
                  disabled={!hasRatePlans}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("bookings.form.ratePlanPh")} />
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
                  {t("bookings.form.checkIn")}
                </label>
                <DatePickerField
                  id="bk-check-in"
                  value={checkIn}
                  onChange={setCheckIn}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-check-out" className="text-sm font-medium">
                  {t("bookings.form.checkOut")}
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
                  {t("bookings.form.firstName")}
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
                  {t("bookings.form.lastName")}
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
                  {t("bookings.form.email")}
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
                  {t("bookings.form.phone")}
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
                  {t("bookings.form.passport")}
                </label>
                <Input
                  id="bk-guest-passport"
                  value={guestPassport}
                  onChange={(e) => {
                    setGuestPassport(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t("bookings.source.label")}
                </span>
                <Select value={bookingSource} onValueChange={setBookingSource}>
                  <SelectTrigger aria-label={t("bookings.source.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "direct",
                        "ota",
                        "phone",
                        "walk_in",
                        "website",
                        "email",
                      ] as const
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`booking.source.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="bk-guests-count" className="text-sm font-medium">
                  {t("bookings.guestsCount.label")}
                </label>
                <Input
                  id="bk-guests-count"
                  type="number"
                  min={1}
                  max={selectedRoomType?.max_occupancy ?? undefined}
                  value={guestsCount}
                  onChange={(e) => {
                    setGuestsCount(e.target.value);
                  }}
                />
              </div>
            </div>
            {countryPackCode !== null &&
            countryPackCode.trim() !== "" &&
            packDetail !== undefined ? (
              <div className="rounded-md border border-border bg-card/50 p-3">
                <p className="text-sm font-medium text-foreground">
                  {t("bookings.priceBreakdown")}
                </p>
                {priceSubtotal !== null ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("bookings.roomSubtotal")}:{" "}
                    {formatMoneyAmount(
                      propertyRow?.currency ?? "USD",
                      priceSubtotal.toFixed(2),
                      i18n.language
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("bookings.selectRatesForTaxPreview")}
                  </p>
                )}
                <TaxBreakdown
                  baseAmount={priceSubtotal}
                  taxLines={bookingTaxPreviewLines}
                  currencyCode={propertyRow?.currency ?? "USD"}
                />
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                }}
              >
                {t("common.cancel")}
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
                  ? t("bookings.form.creating")
                  : t("bookings.form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
