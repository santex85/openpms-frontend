import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Calculator,
  Copy,
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Printer,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import type { BookingPatchBody } from "@/api/bookings";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { BookingStripePaymentsSection } from "@/components/bookings/BookingStripePaymentsSection";
import { SalesTaxReceiptLines } from "@/components/bookings/SalesTaxReceiptLines";
import { CheckInRequirementsModal } from "@/components/bookings/CheckInRequirementsModal";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCanManageProperties,
  useCanStripeCharge,
  useCanWriteBookings,
} from "@/hooks/useAuthz";
import { useCountryPackExtensions } from "@/hooks/useCountryPackExtensions";
import { useBooking } from "@/hooks/useBooking";
import { useBookingFolio } from "@/hooks/useBookingFolio";
import {
  useFolioEntry,
  useFolioReverseTransaction,
} from "@/hooks/useFolioMutations";
import { usePatchBooking } from "@/hooks/usePatchBooking";
import { useProperties } from "@/hooks/useProperties";
import { useRatePlansForProperty } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import { bookingDisplayHash } from "@/lib/bookingDisplay";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import { BOOKING_STATUS_TRANSITIONS } from "@/lib/bookingStatusTransitions";
import { showApiRouteHints } from "@/lib/devUi";
import { formatApiError } from "@/lib/formatApiError";
import { formatMoneyAmount } from "@/lib/formatMoney";
import {
  isCountryPackAutoTaxTransaction,
  folioRowAllowsManualReverse,
  stripCountryPackTaxDescription,
} from "@/lib/folioCountryPack";
import { computeFolioTotals, isRoomLikeFolioCategory } from "@/lib/folioTotals";
import { parseCheckInMissingFields } from "@/lib/parseCheckInMissingFields";
import {
  bookingSourceLabel,
  bookingSummaryBadgeLabel,
  bookingSummaryStatusBadgeClass,
  folioTransactionTypeLabel,
  roomTypeDisplayName,
} from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/api";
import type { Guest } from "@/types/guests";
import {
  countBookingNights,
  formatBookingDateTimeRu,
  formatBookingNightsRu,
  formatIsoDateLocal,
  formatPropertyTimeHm,
} from "@/utils/boardDates";

function dedupeBookingGuests(booking: Booking): Guest[] {
  const primary = booking.guest;
  const rest = booking.guests ?? [];
  const seen = new Set<string>();
  const out: Guest[] = [];
  for (const g of [primary, ...rest]) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  }
  return out;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "promptpay", label: "PromptPay" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "other", label: "Другое" },
] as const;

export function BookingDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? "";
  const canWriteBookings = useCanWriteBookings();
  const canStripeCharge = useCanStripeCharge();
  const canManageProperty = useCanManageProperties();
  const { data: countryPackExtensions } =
    useCountryPackExtensions(canManageProperty);
  const { data: properties } = useProperties();
  const { data: rooms } = useRooms();
  const { data: roomTypes } = useRoomTypes();

  const {
    data: booking,
    isPending: bookingPending,
    isError: bookingError,
    error: bookingErr,
  } = useBooking(bookingId);

  const { data: ratePlans } = useRatePlansForProperty(booking?.property_id);

  const { data: folio, isPending: folioPending, isError: folioError } =
    useBookingFolio(bookingId || undefined);

  const folioEntryMutation = useFolioEntry();
  const reverseTxMutation = useFolioReverseTransaction();
  const patchBookingMutation = usePatchBooking(bookingId);

  const [chargeOpen, setChargeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeCategory, setChargeCategory] = useState("misc");
  const [chargeDescription, setChargeDescription] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [folioFormError, setFolioFormError] = useState<string | null>(null);

  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkInMissingFields, setCheckInMissingFields] = useState<string[]>(
    []
  );

  const propertyCurrency = useMemo(() => {
    if (booking === undefined || properties === undefined) {
      return "USD";
    }
    const p = properties.find((x) => x.id === booking.property_id);
    return p?.currency?.trim().toUpperCase() ?? "USD";
  }, [booking, properties]);

  const propertyRow = useMemo(() => {
    if (booking === undefined || properties === undefined) {
      return undefined;
    }
    return properties.find((x) => x.id === booking.property_id);
  }, [booking, properties]);

  const checkinTimeHm = formatPropertyTimeHm(propertyRow?.checkin_time);
  const checkoutTimeHm = formatPropertyTimeHm(propertyRow?.checkout_time);

  const roomLabel = useMemo(() => {
    if (booking === undefined || rooms === undefined) {
      return null;
    }
    if (booking.room_id === null) {
      return "без номера";
    }
    const r = rooms.find((x) => x.id === booking.room_id);
    return r?.name ?? "номер";
  }, [booking, rooms]);

  const roomTypeLabel = useMemo(() => {
    if (
      booking === undefined ||
      roomTypes === undefined ||
      booking.room_type_id === undefined ||
      booking.room_type_id === null
    ) {
      return null;
    }
    const nm = roomTypes.find((t) => t.id === booking.room_type_id)?.name;
    return nm !== undefined ? roomTypeDisplayName(nm) : "категория";
  }, [booking, roomTypes]);

  const ratePlanLabel = useMemo(() => {
    if (
      booking?.rate_plan_id === undefined ||
      booking.rate_plan_id === null ||
      ratePlans === undefined
    ) {
      return null;
    }
    return (
      ratePlans.find((rp) => rp.id === booking.rate_plan_id)?.name ?? null
    );
  }, [booking, ratePlans]);

  const folioTotals = useMemo(
    () => computeFolioTotals(folio?.transactions ?? []),
    [folio?.transactions]
  );

  const extraTransactions = useMemo(() => {
    return (folio?.transactions ?? []).filter((t) => {
      if (t.transaction_type.trim().toLowerCase() !== "charge") {
        return false;
      }
      if (isCountryPackAutoTaxTransaction(t)) {
        return false;
      }
      return !isRoomLikeFolioCategory(t.category);
    });
  }, [folio?.transactions]);

  const countryPackTaxTransactions = useMemo(() => {
    return (folio?.transactions ?? []).filter(
      (t) =>
        t.transaction_type.trim().toLowerCase() === "charge" &&
        isCountryPackAutoTaxTransaction(t)
    );
  }, [folio?.transactions]);

  const showExtensionCheckInBanner = useMemo(() => {
    if (booking === undefined) {
      return false;
    }
    if (booking.status.trim().toLowerCase() !== "confirmed") {
      return false;
    }
    const ci = booking.check_in_date;
    if (ci === null || ci === undefined || ci === "") {
      return false;
    }
    const start = new Date(ci).getTime();
    if (!Number.isFinite(start)) {
      return false;
    }
    const hours = (start - Date.now()) / (3600 * 1000);
    if (hours < 0 || hours > 48) {
      return false;
    }
    return (countryPackExtensions ?? []).some(
      (e) => e.required_fields.length > 0
    );
  }, [booking, countryPackExtensions]);

  const paymentTransactions = useMemo(() => {
    return (folio?.transactions ?? []).filter(
      (t) => t.transaction_type.trim().toLowerCase() === "payment"
    );
  }, [folio?.transactions]);

  const balanceNum = useMemo(() => {
    const raw = folio?.balance ?? "0";
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }, [folio?.balance]);

  const guestsRows = useMemo(
    () => (booking !== undefined ? dedupeBookingGuests(booking) : []),
    [booking]
  );

  const nights = useMemo(() => {
    if (booking === undefined) {
      return null;
    }
    return countBookingNights(
      booking.check_in_date,
      booking.check_out_date
    );
  }, [booking]);

  const titleGuest =
    booking !== undefined
      ? `${capitalizeGuestName(booking.guest.last_name)} ${capitalizeGuestName(booking.guest.first_name)}`.trim()
      : "";

  async function submitCharge(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFolioFormError(null);
    const amt = chargeAmount.trim();
    if (amt === "" || bookingId === "") {
      setFolioFormError("Укажите сумму.");
      return;
    }
    const cat = chargeCategory.trim();
    if (cat.toLowerCase() === "room" || isRoomLikeFolioCategory(cat)) {
      setFolioFormError(
        "Для проживания используйте категорию, отличную от «номер» (напр. misc, service)."
      );
      return;
    }
    try {
      await folioEntryMutation.mutateAsync({
        bookingId,
        body: {
          entry_type: "charge",
          amount: amt,
          category: cat !== "" ? cat : "misc",
          description: chargeDescription.trim() || null,
        },
      });
      setChargeOpen(false);
      setChargeAmount("");
      setChargeDescription("");
    } catch (err) {
      setFolioFormError(formatApiError(err));
    }
  }

  function openExtraChargeDialog(): void {
    setFolioFormError(null);
    setChargeCategory("misc");
    setChargeDescription("");
    setChargeAmount("");
    setChargeOpen(true);
  }

  async function submitPayment(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFolioFormError(null);
    const amt = paymentAmount.trim();
    if (amt === "" || bookingId === "") {
      setFolioFormError("Укажите сумму.");
      return;
    }
    try {
      await folioEntryMutation.mutateAsync({
        bookingId,
        body: {
          entry_type: "payment",
          amount: amt,
          payment_method: paymentMethod.trim() || "card",
          description: paymentDescription.trim() || null,
        },
      });
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentDescription("");
    } catch (err) {
      setFolioFormError(formatApiError(err));
    }
  }

  async function submitNotes(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (booking === undefined) {
      return;
    }
    try {
      await patchBookingMutation.mutateAsync({
        notes: noteDraft.trim() === "" ? null : noteDraft.trim(),
      });
      setNotesOpen(false);
    } catch {
      /* mutation error surfaced below */
    }
  }

  function reverseTxLabel(err: unknown): string {
    const msg = formatApiError(err);
    if (msg.includes("404") || msg.includes("405")) {
      return "Отменить эту операцию нельзя (ограничение API или правил фолио).";
    }
    return msg;
  }

  async function submitCheckIn(): Promise<void> {
    try {
      await patchBookingMutation.mutateAsync({
        status: "checked_in",
        check_in: formatIsoDateLocal(new Date()),
      });
    } catch (err) {
      const missing = parseCheckInMissingFields(err);
      if (missing !== null && missing.length > 0) {
        setCheckInMissingFields(missing);
        setCheckInModalOpen(true);
        return;
      }
    }
  }

  /** Короткая подпись: что именно отменяем в фолио. */
  function folioUndoRowLabel(transactionType: string): string {
    const typ = transactionType.trim().toLowerCase();
    if (typ === "payment") {
      return "Отменить оплату";
    }
    if (typ === "refund") {
      return "Отменить возврат";
    }
    if (typ === "adjustment") {
      return "Отменить корректировку";
    }
    return "Отменить начисление";
  }

  function copyBookingId(): void {
    if (bookingId === "" || typeof navigator === "undefined") {
      return;
    }
    void navigator.clipboard.writeText(bookingId);
  }

  const bookingStatus = booking?.status.trim().toLowerCase() ?? "";
  const allowedTransitions =
    BOOKING_STATUS_TRANSITIONS[bookingStatus] ?? [];
  const canShowStatusActions =
    canWriteBookings && booking !== undefined && allowedTransitions.length > 0;

  function runPatch(body: BookingPatchBody): void {
    patchBookingMutation.mutate(body);
  }

  function openNotesDialog(): void {
    if (booking === undefined) {
      return;
    }
    setNoteDraft(booking.notes ?? "");
    setNotesOpen(true);
  }

  if (bookingId === "") {
    return (
      <p className="text-sm text-muted-foreground">Не указан id брони.</p>
    );
  }

  const headerTitle =
    booking !== undefined ? (
      <>
        <span className="text-foreground">{titleGuest}</span>
        {roomLabel !== null ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {roomLabel}
            {roomTypeLabel !== null ? ` (${roomTypeLabel})` : ""}
          </span>
        ) : null}
      </>
    ) : null;

  return (
    <div className="space-y-6 pb-28 print:pb-4">
      {bookingPending ? (
        <p className="text-sm text-muted-foreground">Загрузка карточки…</p>
      ) : bookingError ? (
        <p className="text-sm text-destructive" role="alert">
          {bookingErr !== null ? formatApiError(bookingErr) : "Ошибка загрузки."}
        </p>
      ) : booking === undefined ? (
        <p className="text-sm text-muted-foreground">Нет данных брони.</p>
      ) : (
        <>
          <header
            className={cn(
              "sticky top-0 z-40 -mx-1 border-b border-border bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:static print:border-0 print:bg-transparent"
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-2 sm:items-start">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="print:hidden mt-0.5 shrink-0 sm:mt-1"
                >
                  <Link to="/bookings">← К списку</Link>
                </Button>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold leading-snug">
                      {headerTitle}
                    </h2>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      bookingSummaryStatusBadgeClass(booking.status)
                    )}
                  >
                    {bookingSummaryBadgeLabel(booking.status)}
                  </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      #{bookingDisplayHash(booking.id)}
                    </span>
                  </div>
                  {showApiRouteHints() ? (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      id: {bookingId}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {patchBookingMutation.isPending ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
                {canShowStatusActions ? (
                  <>
                    {allowedTransitions.includes("confirmed") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={patchBookingMutation.isPending}
                        onClick={() => {
                          runPatch({ status: "confirmed" });
                        }}
                      >
                        Подтвердить
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("checked_in") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={patchBookingMutation.isPending}
                        onClick={() => void submitCheckIn()}
                      >
                        Заезд
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("checked_out") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={patchBookingMutation.isPending}
                        onClick={() => {
                          runPatch({
                            status: "checked_out",
                            check_out: formatIsoDateLocal(new Date()),
                          });
                        }}
                      >
                        Выезд
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {canWriteBookings ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={openNotesDialog}
                  >
                    Редактировать
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer className="mr-1.5 h-4 w-4" aria-hidden />
                  Квитанция
                </Button>
                {canShowStatusActions &&
                (allowedTransitions.includes("cancelled") ||
                  allowedTransitions.includes("no_show")) ? (
                  <Popover
                    open={moreActionsOpen}
                    onOpenChange={setMoreActionsOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={patchBookingMutation.isPending}
                      >
                        <MoreHorizontal className="mr-1 h-4 w-4" aria-hidden />
                        Ещё
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="flex flex-col gap-1">
                        {allowedTransitions.includes("cancelled") ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              setCancelReasonDraft("");
                              setMoreActionsOpen(false);
                              setCancelConfirmOpen(true);
                            }}
                          >
                            Отменить
                          </Button>
                        ) : null}
                        {allowedTransitions.includes("no_show") ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => {
                              setMoreActionsOpen(false);
                              setNoShowConfirmOpen(true);
                            }}
                          >
                            No-show
                          </Button>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            </div>
          </header>

          {patchBookingMutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {formatApiError(patchBookingMutation.error)}
            </p>
          ) : null}

          {showExtensionCheckInBanner ? (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              role="status"
            >
              {t("checkIn.extensionBanner")}
            </div>
          ) : null}

          <section className="rounded-lg border border-border bg-card/40 p-4 print:break-inside-avoid">
            <h3 className="mb-3 text-base font-semibold text-foreground">
              Сводка
            </h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">ID брони</dt>
                <dd className="mt-0.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      #{bookingDisplayHash(booking.id)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs print:hidden"
                      onClick={copyBookingId}
                    >
                      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Копировать UUID
                    </Button>
                  </div>
                  <details className="text-xs print:hidden">
                    <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                      Полный UUID
                    </summary>
                    <code className="mt-1 block break-all font-mono text-[11px] text-foreground">
                      {bookingId}
                    </code>
                  </details>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Источник</dt>
                <dd className="mt-0.5">
                  {bookingSourceLabel(booking.source)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Тип брони</dt>
                <dd className="mt-0.5">
                  {booking.booking_type !== undefined &&
                  booking.booking_type !== null &&
                  booking.booking_type.trim() !== ""
                    ? booking.booking_type
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Тариф</dt>
                <dd className="mt-0.5">
                  {booking.rate_plan_id !== undefined &&
                  booking.rate_plan_id !== null ? (
                    <>
                      {ratePlanLabel ?? `id: ${booking.rate_plan_id}`}
                      <Link
                        to="/rates"
                        className="ml-2 text-xs font-medium text-primary underline-offset-4 hover:underline print:hidden"
                      >
                        Тарифы
                      </Link>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Тип номера</dt>
                <dd className="mt-0.5">
                  {roomTypeLabel ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Заезд</dt>
                <dd className="mt-0.5 tabular-nums">
                  {formatBookingDateTimeRu(
                    booking.check_in_date,
                    checkinTimeHm
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Выезд</dt>
                <dd className="mt-0.5 tabular-nums">
                  {formatBookingDateTimeRu(
                    booking.check_out_date,
                    checkoutTimeHm
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ночей</dt>
                <dd className="mt-0.5">
                  {nights !== null ? formatBookingNightsRu(nights) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Сумма брони</dt>
                <dd className="mt-0.5 tabular-nums font-medium">
                  {formatMoneyAmount(
                    propertyCurrency,
                    booking.total_amount,
                    i18n.language
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Сумма к доплате</dt>
                <dd
                  className={cn(
                    "mt-0.5 tabular-nums font-semibold",
                    balanceNum > 0
                      ? "text-destructive"
                      : "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {folioPending
                    ? "…"
                    : formatMoneyAmount(
                        propertyCurrency,
                        folio?.balance ?? "0",
                        i18n.language
                      )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Контакт</dt>
                <dd className="mt-0.5 break-all">
                  {[
                    booking.guest.email?.trim(),
                    booking.guest.phone?.trim(),
                  ]
                    .filter(
                      (x): x is string =>
                        x !== undefined && x !== null && x !== ""
                    )
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2 print:break-inside-avoid">
            <h3 className="text-base font-semibold text-foreground">Заметка</h3>
            {booking.notes !== undefined &&
            booking.notes !== null &&
            booking.notes.trim() !== "" ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {booking.notes}
                {canWriteBookings ? (
                  <div className="mt-2 print:hidden">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={openNotesDialog}
                    >
                      Изменить
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {canWriteBookings ? (
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={openNotesDialog}
                  >
                    Добавить заметку
                  </button>
                ) : (
                  "Нет заметки."
                )}
              </p>
            )}
          </section>

          <section className="space-y-2 print:break-inside-avoid">
            <h3 className="text-base font-semibold text-foreground">Гости</h3>
            {guestsRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет гостей.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border print:overflow-visible">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-2 py-1.5">Гость</th>
                      <th className="px-2 py-1.5">E-mail</th>
                      <th className="px-2 py-1.5">Телефон</th>
                      <th className="px-2 py-1.5">Карточка</th>
                      <th className="px-2 py-1.5 text-right print:hidden">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestsRows.map((g) => {
                      const isPrimary = g.id === booking.guest.id;
                      return (
                        <tr
                          key={g.id}
                          className="border-b border-border/60"
                        >
                          <td className="px-2 py-1.5">
                            <span className="font-medium">
                              {capitalizeGuestName(g.last_name)}{" "}
                              {capitalizeGuestName(g.first_name)}
                            </span>
                            {isPrimary ? (
                              <span className="ml-2 inline-flex rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                                Основной
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {g.email?.trim() || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {g.phone?.trim() || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <Link
                              to={`/guests/${g.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Открыть
                            </Link>
                          </td>
                          <td className="px-2 py-1.5 text-right print:hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7"
                              disabled
                              title="Нет API"
                            >
                              Редактировать
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7"
                              disabled
                              title="Нет API"
                            >
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {countryPackTaxTransactions.length > 0 ? (
            <section className="space-y-2 print:break-inside-avoid">
              <h3 className="text-base font-semibold text-foreground">
                {t("folio.countryPackTaxesTitle")}
              </h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-2 py-1.5">{t("folio.colDate")}</th>
                      <th className="px-2 py-1.5">{t("folio.colDescription")}</th>
                      <th className="px-2 py-1.5 text-right">
                        {t("folio.colAmount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {countryPackTaxTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/60">
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                          {tx.created_at.slice(0, 19).replace("T", " ")}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-2">
                            <Calculator
                              className="h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span className="text-muted-foreground">
                              {stripCountryPackTaxDescription(
                                tx.description ?? ""
                              ) || tx.category}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {t("folio.autoTaxBadge")}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(
                            propertyCurrency,
                            tx.amount,
                            i18n.language
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="space-y-2 print:break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Доп. услуги
              </h3>
              {canWriteBookings ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="print:hidden"
                  onClick={openExtraChargeDialog}
                >
                  <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
                  Добавить услугу
                </Button>
              ) : null}
            </div>
            {folioError ? (
              <p className="text-sm text-destructive">
                Не удалось загрузить фолио.
              </p>
            ) : folioPending ? (
              <div
                className="h-24 animate-pulse rounded-md bg-muted"
                aria-hidden
              />
            ) : extraTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Нет дополнительных начислений.{" "}
                {canWriteBookings ? (
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline print:hidden"
                    onClick={openExtraChargeDialog}
                  >
                    Добавить услугу
                  </button>
                ) : null}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-2 py-1.5">Дата</th>
                      <th className="px-2 py-1.5">Категория</th>
                      <th className="px-2 py-1.5">Описание</th>
                      <th className="px-2 py-1.5 text-right">Сумма</th>
                      {canWriteBookings ? (
                        <th className="px-2 py-1.5 text-right print:hidden">
                          Действия
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {extraTransactions.map((t) => (
                      <tr key={t.id} className="border-b border-border/60">
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                          {t.created_at.slice(0, 19).replace("T", " ")}
                        </td>
                        <td className="px-2 py-1.5">{t.category}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {t.description?.trim() || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(propertyCurrency, t.amount, i18n.language)}
                        </td>
                        {canWriteBookings ? (
                          <td className="px-2 py-1.5 text-right print:hidden">
                            {!folioRowAllowsManualReverse(t) ? (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive"
                                disabled={reverseTxMutation.isPending}
                                onClick={() => {
                                  void (async () => {
                                    setFolioFormError(null);
                                    try {
                                      await reverseTxMutation.mutateAsync({
                                        bookingId,
                                        transactionId: t.id,
                                      });
                                    } catch (err) {
                                      setFolioFormError(reverseTxLabel(err));
                                    }
                                  })();
                                }}
                              >
                                {folioUndoRowLabel(t.transaction_type)}
                              </Button>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-medium">
                      <td
                        className="px-2 py-1.5"
                        colSpan={canWriteBookings ? 3 : 3}
                      >
                        Итого доп. услуг
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatMoneyAmount(
                          propertyCurrency,
                          String(folioTotals.extrasCharges),
                          i18n.language
                        )}
                      </td>
                      {canWriteBookings ? <td className="print:hidden" /> : null}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-2 print:break-inside-avoid">
            <h3 className="text-base font-semibold text-foreground">
              Начисления
            </h3>
            {folioError || folioPending ? null : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5">Статья</th>
                        <th className="px-2 py-1.5 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="px-2 py-1.5">Проживание</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(
                            propertyCurrency,
                            String(folioTotals.roomCharges),
                            i18n.language
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="px-2 py-1.5">
                          {t("folio.summaryCountryPackTaxes")}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(
                            propertyCurrency,
                            String(folioTotals.countryPackTaxes),
                            i18n.language
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="px-2 py-1.5">Доп. услуги</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(
                            propertyCurrency,
                            String(folioTotals.extrasCharges),
                            i18n.language
                          )}
                        </td>
                      </tr>
                      <tr className="bg-muted/40 font-semibold">
                        <td className="px-2 py-1.5">Итого начислений</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatMoneyAmount(
                            propertyCurrency,
                            String(folioTotals.chargesGross),
                            i18n.language
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <SalesTaxReceiptLines
                  propertyId={booking?.property_id}
                  chargesTotal={folioTotals.chargesGross}
                  currencyCode={propertyCurrency}
                />
              </>
            )}
          </section>

          <section className="space-y-2 print:break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Платежи
              </h3>
              <div className="flex flex-wrap gap-2 print:hidden">
                {canWriteBookings ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFolioFormError(null);
                        setPaymentOpen(true);
                      }}
                    >
                      <Banknote className="mr-1.5 h-4 w-4" aria-hidden />
                      Добавить оплату
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled
                      title="Скоро"
                    >
                      Выставить счёт
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {folioError ? (
              <p className="text-sm text-destructive">
                Не удалось загрузить фолио.
              </p>
            ) : folioPending ? (
              <div
                className="h-24 animate-pulse rounded-md bg-muted"
                aria-hidden
              />
            ) : (
              <>
                {paymentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Платежей нет.{" "}
                    {canWriteBookings ? (
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-4 hover:underline print:hidden"
                        onClick={() => {
                          setFolioFormError(null);
                          setPaymentOpen(true);
                        }}
                      >
                        Добавить оплату
                      </button>
                    ) : null}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5">Дата</th>
                          <th className="px-2 py-1.5">Способ</th>
                          <th className="px-2 py-1.5">Описание</th>
                          <th className="px-2 py-1.5 text-right">Сумма</th>
                          {canWriteBookings ? (
                            <th className="px-2 py-1.5 text-right print:hidden">
                              Действия
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {paymentTransactions.map((t) => (
                          <tr key={t.id} className="border-b border-border/60">
                            <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                              {t.created_at.slice(0, 19).replace("T", " ")}
                            </td>
                            <td className="px-2 py-1.5">
                              {t.payment_method?.trim() || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {t.description?.trim() || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatMoneyAmount(propertyCurrency, t.amount, i18n.language)}
                            </td>
                            {canWriteBookings ? (
                              <td className="px-2 py-1.5 text-right print:hidden">
                                {!folioRowAllowsManualReverse(t) ? (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-destructive"
                                    disabled={reverseTxMutation.isPending}
                                    onClick={() => {
                                      void (async () => {
                                        setFolioFormError(null);
                                        try {
                                          await reverseTxMutation.mutateAsync({
                                            bookingId,
                                            transactionId: t.id,
                                          });
                                        } catch (err) {
                                          setFolioFormError(
                                            reverseTxLabel(err)
                                          );
                                        }
                                      })();
                                    }}
                                  >
                                    {folioUndoRowLabel(t.transaction_type)}
                                  </Button>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                        <tr className="bg-muted/40 font-medium">
                          <td
                            className="px-2 py-1.5"
                            colSpan={canWriteBookings ? 3 : 3}
                          >
                            Итого принято
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMoneyAmount(
                              propertyCurrency,
                              String(folioTotals.paymentsTotal),
                              i18n.language
                            )}
                          </td>
                          {canWriteBookings ? (
                            <td className="print:hidden" />
                          ) : null}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div
                  className={cn(
                    "mt-3 rounded-md border px-3 py-3 text-sm",
                    balanceNum > 0
                      ? "border-destructive/35 bg-destructive/10"
                      : "border-emerald-600/35 bg-emerald-500/10 dark:bg-emerald-950/40"
                  )}
                >
                  <div className="font-medium text-foreground">
                    Сумма к доплате
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      balanceNum > 0
                        ? "text-destructive"
                        : "text-emerald-800 dark:text-emerald-300"
                    )}
                  >
                    {formatMoneyAmount(
                      propertyCurrency,
                      folio?.balance ?? "0",
                      i18n.language
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {booking !== undefined ? (
            <BookingStripePaymentsSection
              bookingId={bookingId}
              propertyId={booking.property_id}
              propertyCurrency={propertyCurrency}
              canStripeCharge={canStripeCharge}
            />
          ) : null}

          <details className="rounded-md border border-border bg-muted/20 p-3 text-sm print:break-inside-avoid">
            <summary className="cursor-pointer font-medium text-foreground">
              История и аудит
            </summary>
            <p className="mt-2 text-muted-foreground">
              История смен статусов на бэкенде в этой карточке не отображается
              (нет отдельного API).{" "}
              <Link
                to={`/audit-log?entity_id=${bookingId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Журнал аудита
              </Link>{" "}
              — фильтр по сущности при наличии записей.
            </p>
          </details>

          {folioFormError !== null ? (
            <p className="text-sm text-destructive" role="alert">
              {folioFormError}
            </p>
          ) : null}

          <details className="group rounded-md border border-border p-3 text-sm print:hidden">
            <summary className="cursor-pointer font-medium text-foreground">
              Журнал проводок (все операции)
            </summary>
            <div className="mt-3">
              {folioError ? (
                <p className="text-sm text-destructive">
                  Не удалось загрузить фолио.
                </p>
              ) : folioPending ? (
                <div
                  className="h-32 animate-pulse rounded-md bg-muted"
                  aria-hidden
                />
              ) : folio === undefined ? null : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5">Дата</th>
                        <th className="px-2 py-1.5">Тип</th>
                        <th className="px-2 py-1.5">Категория</th>
                        <th className="px-2 py-1.5 text-right">Сумма</th>
                        {canWriteBookings ? (
                          <th className="px-2 py-1.5 text-right">Действия</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {folio.transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/60">
                          <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                            {tx.created_at.slice(0, 19).replace("T", " ")}
                          </td>
                          <td className="px-2 py-1.5">
                            {folioTransactionTypeLabel(tx.transaction_type)}
                          </td>
                          <td className="px-2 py-1.5">
                            {isCountryPackAutoTaxTransaction(tx) ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Calculator
                                  className="h-3.5 w-3.5 text-muted-foreground"
                                  aria-hidden
                                />
                                <span>
                                  {stripCountryPackTaxDescription(
                                    tx.description ?? ""
                                  ) || tx.category}
                                </span>
                              </span>
                            ) : (
                              tx.category
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMoneyAmount(propertyCurrency, tx.amount, i18n.language)}
                          </td>
                          {canWriteBookings ? (
                            <td className="px-2 py-1.5 text-right">
                              {!folioRowAllowsManualReverse(tx) ? (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive"
                                  disabled={reverseTxMutation.isPending}
                                  onClick={() => {
                                    void (async () => {
                                      setFolioFormError(null);
                                      try {
                                        await reverseTxMutation.mutateAsync({
                                          bookingId,
                                          transactionId: tx.id,
                                        });
                                      } catch (err) {
                                        setFolioFormError(reverseTxLabel(err));
                                      }
                                    })();
                                  }}
                                >
                                  {folioUndoRowLabel(tx.transaction_type)}
                                </Button>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {folio.transactions.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      Транзакций нет.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </details>

          <footer
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 print:hidden"
            )}
          >
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
              {patchBookingMutation.isPending ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              {canShowStatusActions ? (
                <>
                  {allowedTransitions.includes("checked_in") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => void submitCheckIn()}
                    >
                      Заезд
                    </Button>
                  ) : null}
                  {allowedTransitions.includes("checked_out") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        runPatch({
                          status: "checked_out",
                          check_out: formatIsoDateLocal(new Date()),
                        });
                      }}
                    >
                      Выезд
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="mr-1.5 h-4 w-4" aria-hidden />
                Печать
              </Button>
            </div>
          </footer>

          <CheckInRequirementsModal
            open={checkInModalOpen}
            onOpenChange={setCheckInModalOpen}
            missingFields={checkInMissingFields}
            guestId={booking.guest.id}
          />
        </>
      )}

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(e) => void submitNotes(e)}>
            <DialogHeader>
              <DialogTitle>Заметка к брони</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                Сохраняется через PATCH бронирования.
                <ApiRouteHint>PATCH /bookings/…</ApiRouteHint>
              </DialogDescription>
            </DialogHeader>
            <textarea
              id="booking-note"
              name="booking-note"
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
              }}
              rows={5}
              className="mt-2 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Текст заметки…"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNotesOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={patchBookingMutation.isPending}>
                {patchBookingMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {patchBookingMutation.isPending ? "Сохранение…" : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отменить бронирование?</DialogTitle>
            <DialogDescription>
              Статус будет изменён на «Отменена». При необходимости укажите
              причину — она уйдёт в поле{" "}
              <span className="font-mono text-xs">cancellation_reason</span>.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Причина отмены"
            value={cancelReasonDraft}
            onChange={(e) => {
              setCancelReasonDraft(e.target.value);
            }}
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelConfirmOpen(false);
              }}
            >
              Не отменять
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={patchBookingMutation.isPending}
              onClick={() => {
                runPatch({
                  status: "cancelled",
                  cancellation_reason:
                    cancelReasonDraft.trim() !== ""
                      ? cancelReasonDraft.trim()
                      : "Отмена с карточки брони",
                });
                setCancelConfirmOpen(false);
              }}
            >
              Отменить бронь
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noShowConfirmOpen} onOpenChange={setNoShowConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пометить как No-show?</DialogTitle>
            <DialogDescription>
              Гость не заехал. Статус брони будет изменён на «Не заезд».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNoShowConfirmOpen(false);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={patchBookingMutation.isPending}
              onClick={() => {
                runPatch({ status: "no_show" });
                setNoShowConfirmOpen(false);
              }}
            >
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitCharge(e)}>
            <DialogHeader>
              <DialogTitle>Начисление (доп. услуга)</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                Категория не должна быть «номер» / проживание — используйте, на
                пример, <span className="font-mono">misc</span>,{" "}
                <span className="font-mono">service</span>,{" "}
                <span className="font-mono">fb</span>.
                <ApiRouteHint>POST /bookings/…/folio · charge</ApiRouteHint>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <label htmlFor="chg-amt" className="text-sm font-medium">
                  Сумма
                </label>
                <Input
                  id="chg-amt"
                  value={chargeAmount}
                  onChange={(e) => {
                    setChargeAmount(e.target.value);
                  }}
                  placeholder="100.00"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="chg-cat" className="text-sm font-medium">
                  Категория
                </label>
                <Input
                  id="chg-cat"
                  value={chargeCategory}
                  onChange={(e) => {
                    setChargeCategory(e.target.value);
                  }}
                  placeholder="misc, service…"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="chg-desc" className="text-sm font-medium">
                  Описание
                </label>
                <Input
                  id="chg-desc"
                  value={chargeDescription}
                  onChange={(e) => {
                    setChargeDescription(e.target.value);
                  }}
                  placeholder="Необязательно"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChargeOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={folioEntryMutation.isPending}>
                {folioEntryMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {folioEntryMutation.isPending ? "Отправка…" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitPayment(e)}>
            <DialogHeader>
              <DialogTitle>Оплата</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>Провести платёж по фолио.</span>
                <ApiRouteHint>POST /bookings/…/folio · payment</ApiRouteHint>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <label htmlFor="pay-amt" className="text-sm font-medium">
                  Сумма
                </label>
                <Input
                  id="pay-amt"
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                  }}
                  placeholder="100.00"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="pay-meth" className="text-sm font-medium">
                  Способ оплаты
                </label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => {
                    setPaymentMethod(v);
                  }}
                >
                  <SelectTrigger id="pay-meth">
                    <SelectValue placeholder="Выберите способ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="pay-desc" className="text-sm font-medium">
                  Описание
                </label>
                <Input
                  id="pay-desc"
                  value={paymentDescription}
                  onChange={(e) => {
                    setPaymentDescription(e.target.value);
                  }}
                  placeholder="Необязательно"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={folioEntryMutation.isPending}>
                {folioEntryMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {folioEntryMutation.isPending
                  ? "Отправка…"
                  : "Провести оплату"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
