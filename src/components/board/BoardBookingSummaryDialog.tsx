import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { BookingPatchBody } from "@/api/bookings";
import type { FolioTransactionRead } from "@/api/folio";
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
import { useBookingFolio } from "@/hooks/useBookingFolio";
import { useProperties } from "@/hooks/useProperties";
import { bookingDisplayHash } from "@/lib/bookingDisplay";
import { BOOKING_STATUS_TRANSITIONS } from "@/lib/bookingStatusTransitions";
import { formatMoneyAmount } from "@/lib/formatMoney";
import {
  bookingStatusLabel,
  bookingSummaryBadgeLabel,
  bookingSummaryStatusBadgeClass,
} from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import type { Booking, Guest } from "@/types/api";
import {
  countBookingNights,
  formatBookingNightsRu,
  formatBookingStayRu,
  formatIsoDateLocal,
} from "@/utils/boardDates";

const NOTES_PREVIEW = 100;

function sumPaymentAmounts(transactions: FolioTransactionRead[]): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.transaction_type.trim().toLowerCase() !== "payment") {
      continue;
    }
    const n = Number.parseFloat(t.amount);
    if (Number.isFinite(n)) {
      sum += n;
    }
  }
  return sum;
}

function parseMoney(n: string): number {
  const x = Number.parseFloat(n);
  return Number.isFinite(x) ? x : 0;
}

export interface BoardBookingSummaryDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string | null;
  roomTypeName: string | null;
  canWriteBookings: boolean;
  patchIsPending: boolean;
  onPatch: (bookingId: string, body: BookingPatchBody) => void;
  onReschedule: (booking: Booking) => void;
  /** Navigate to full booking (card / folio); caller should close dialog. */
  onGoToBooking: (bookingId: string) => void;
}

function dedupeGuests(items: Guest[]): Guest[] {
  const seen = new Set<string>();
  const out: Guest[] = [];
  for (const g of items) {
    if (seen.has(g.id)) {
      continue;
    }
    seen.add(g.id);
    out.push(g);
  }
  return out;
}

export function BoardBookingSummaryDialog({
  booking,
  open,
  onOpenChange,
  roomName,
  roomTypeName,
  canWriteBookings,
  patchIsPending,
  onPatch,
  onReschedule,
  onGoToBooking,
}: BoardBookingSummaryDialogProps) {
  const { data: properties } = useProperties();
  const bookingId = booking?.id;
  const {
    data: folio,
    isPending: folioPending,
    isError: folioError,
  } = useBookingFolio(open ? bookingId : undefined);

  const [guestsExpanded, setGuestsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const currency = useMemo(() => {
    if (booking === null || properties === undefined) {
      return "USD";
    }
    const p = properties.find((x) => x.id === booking.property_id);
    return p?.currency?.trim().toUpperCase() ?? "USD";
  }, [booking, properties]);

  const stayLine = useMemo(() => {
    if (booking === null) {
      return null;
    }
    return formatBookingStayRu(booking.check_in_date, booking.check_out_date);
  }, [booking]);

  const nights = useMemo(() => {
    if (booking === null) {
      return null;
    }
    return countBookingNights(booking.check_in_date, booking.check_out_date);
  }, [booking]);

  const allGuests = useMemo(() => {
    if (booking === null) {
      return [];
    }
    return dedupeGuests([booking.guest, ...(booking.guests ?? [])]);
  }, [booking]);

  const visibleGuests = useMemo(() => {
    if (guestsExpanded || allGuests.length <= 3) {
      return allGuests;
    }
    return allGuests.slice(0, 3);
  }, [allGuests, guestsExpanded]);

  const notesRaw = booking?.notes?.trim() ?? "";
  const showNotes = notesRaw !== "";
  const notesTruncated =
    !notesExpanded && notesRaw.length > NOTES_PREVIEW
      ? `${notesRaw.slice(0, NOTES_PREVIEW)}…`
      : notesRaw;

  const bookingStatus = booking?.status.trim().toLowerCase() ?? "";
  const allowedTransitions =
    BOOKING_STATUS_TRANSITIONS[bookingStatus] ?? [];

  const paymentTotal = folio !== undefined
    ? sumPaymentAmounts(folio.transactions)
    : 0;
  const balanceNum = folio !== undefined ? parseMoney(folio.balance) : 0;

  type PayBadge = "paid" | "partial" | "unpaid";
  const paymentBadge: PayBadge = useMemo(() => {
    if (folio === undefined) {
      return "unpaid";
    }
    if (balanceNum <= 0.0001) {
      return "paid";
    }
    if (paymentTotal > 0) {
      return "partial";
    }
    return "unpaid";
  }, [folio, balanceNum, paymentTotal]);

  function handleGoToBooking(id: string): void {
    onGoToBooking(id);
    setCancelDialogOpen(false);
    setCancelReason("");
    setGuestsExpanded(false);
    setNotesExpanded(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setGuestsExpanded(false);
            setNotesExpanded(false);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[80vh] w-full max-w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
          {booking === null ? null : (
            <>
              <DialogHeader className="space-y-2 border-b border-border px-6 pb-4 pt-6 text-left">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <DialogTitle className="text-left text-base leading-snug">
                    Бронирование #{bookingDisplayHash(booking.id)}
                  </DialogTitle>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      bookingSummaryStatusBadgeClass(booking.status)
                    )}
                  >
                    {bookingSummaryBadgeLabel(booking.status)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug text-foreground">
                  {`${booking.guest.last_name} ${booking.guest.first_name}`.trim()}
                </p>
                <DialogDescription className="text-xs text-muted-foreground">
                  ID:{" "}
                  <span className="font-mono tabular-nums">{booking.id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
                <section className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Проживание
                  </h3>
                  <p className="text-foreground">
                    {stayLine ?? "—"}
                    {nights !== null ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({formatBookingNightsRu(nights)})
                      </span>
                    ) : null}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Номер: </span>
                    {booking.room_id !== null ? (
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => {
                          onOpenChange(false);
                        }}
                      >
                        {roomName ?? "—"}
                      </Link>
                    ) : (
                      <span>{roomName ?? "—"}</span>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Категория: </span>
                    <span>{roomTypeName ?? "—"}</span>
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Гости
                  </h3>
                  <ul className="space-y-1">
                    {visibleGuests.map((g) => (
                      <li key={g.id}>
                        <Link
                          to={`/guests/${g.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          onClick={() => {
                            onOpenChange(false);
                          }}
                        >
                          {`${g.last_name} ${g.first_name}`.trim()}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {allGuests.length > 3 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs text-muted-foreground"
                      onClick={() => {
                        setGuestsExpanded((e) => !e);
                      }}
                    >
                      {guestsExpanded
                        ? "Свернуть"
                        : `+${allGuests.length - 3} гостей`}
                    </Button>
                  ) : null}
                </section>

                <section className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Финансы
                  </h3>
                  {folioPending ? (
                    <div
                      className="h-14 animate-pulse rounded-md bg-muted"
                      aria-hidden
                    />
                  ) : folioError ? (
                    <p className="text-xs text-destructive">
                      Фолио недоступно. Откройте карточку брони.
                    </p>
                  ) : folio !== undefined ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            paymentBadge === "paid" &&
                              "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100",
                            paymentBadge === "partial" &&
                              "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
                            paymentBadge === "unpaid" &&
                              "bg-destructive/15 text-destructive"
                          )}
                        >
                          {paymentBadge === "paid"
                            ? "Оплачено"
                            : paymentBadge === "partial"
                              ? "Частично оплачено"
                              : "Не оплачено"}
                        </span>
                      </div>
                      <p>
                        <span className="text-muted-foreground">
                          Итог брони:{" "}
                        </span>
                        <span className="tabular-nums font-medium">
                          {formatMoneyAmount(currency, booking.total_amount)}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Оплачено: </span>
                        <span className="tabular-nums">
                          {formatMoneyAmount(
                            currency,
                            paymentTotal.toFixed(2)
                          )}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Баланс: </span>
                        <span
                          className={cn(
                            "tabular-nums font-semibold",
                            balanceNum > 0.0001 && "text-destructive"
                          )}
                        >
                          {formatMoneyAmount(currency, folio.balance)}
                        </span>
                      </p>
                    </>
                  ) : null}
                </section>

                {showNotes ? (
                  <section className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Заметки
                    </h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {notesTruncated}
                    </p>
                    {notesRaw.length > NOTES_PREVIEW ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 py-0 text-xs"
                        onClick={() => {
                          setNotesExpanded((e) => !e);
                        }}
                      >
                        {notesExpanded ? "Свернуть" : "Ещё"}
                      </Button>
                    ) : null}
                  </section>
                ) : null}
              </div>

              <DialogFooter className="flex-col items-stretch gap-2 border-t border-border px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
                {canWriteBookings && allowedTransitions.length > 0 ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {allowedTransitions.includes("checked_in") ? (
                      <Button
                        type="button"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={patchIsPending}
                        onClick={() => {
                          onPatch(booking.id, {
                            status: "checked_in",
                            check_in: formatIsoDateLocal(new Date()),
                          });
                        }}
                      >
                        {patchIsPending ? (
                          <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : null}
                        Заезд (check-in)
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("checked_out") ? (
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={patchIsPending}
                        onClick={() => {
                          onPatch(booking.id, {
                            status: "checked_out",
                            check_out: formatIsoDateLocal(new Date()),
                          });
                        }}
                      >
                        {patchIsPending ? (
                          <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : null}
                        Выезд (check-out)
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("confirmed") ? (
                      <Button
                        type="button"
                        disabled={patchIsPending}
                        onClick={() => {
                          onPatch(booking.id, { status: "confirmed" });
                        }}
                      >
                        Подтвердить
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("cancelled") ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={patchIsPending}
                        onClick={() => {
                          setCancelDialogOpen(true);
                        }}
                      >
                        Отменить
                      </Button>
                    ) : null}
                    {allowedTransitions.includes("no_show") ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={patchIsPending}
                        onClick={() => {
                          onPatch(booking.id, { status: "no_show" });
                        }}
                      >
                        Не заехал (no-show)
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Закрыть
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={patchIsPending}
                    onClick={() => {
                      onReschedule(booking);
                      onOpenChange(false);
                    }}
                  >
                    Перенос дат…
                  </Button>
                  {booking.status.trim().toLowerCase() === "checked_in" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleGoToBooking(booking.id);
                      }}
                    >
                      Добавить оплату / фолио
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleGoToBooking(booking.id);
                    }}
                  >
                    Карточка / фолио
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отменить бронирование?</DialogTitle>
            <DialogDescription>
              Статус брони станет «{bookingStatusLabel("cancelled")}». Это
              действие отразится в журнале.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Причина отмены (необязательно)"
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
            >
              Не отменять
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={patchIsPending || booking === null}
              onClick={() => {
                if (booking === null) {
                  return;
                }
                onPatch(booking.id, {
                  status: "cancelled",
                  cancellation_reason:
                    cancelReason.trim() !== ""
                      ? cancelReason.trim()
                      : "Отмена из сетки бронирований",
                });
                setCancelDialogOpen(false);
                setCancelReason("");
                onOpenChange(false);
              }}
            >
              Отменить бронирование
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
