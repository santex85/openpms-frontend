import { FormEvent, useMemo, useState } from "react";
import { Banknote, Loader2, PlusCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
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
import { useBooking } from "@/hooks/useBooking";
import { useBookingFolio } from "@/hooks/useBookingFolio";
import {
  useFolioDeleteTransaction,
  useFolioEntry,
} from "@/hooks/useFolioMutations";
import { usePatchBooking } from "@/hooks/usePatchBooking";
import { useProperties } from "@/hooks/useProperties";
import { useRooms } from "@/hooks/useRooms";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import {
  bookingStatusLabel,
  folioTransactionTypeLabel,
} from "@/lib/i18n/domainLabels";
import { showApiRouteHints } from "@/lib/showApiRouteHints";
import { formatApiError } from "@/lib/formatApiError";
import { useCanWriteBookings } from "@/hooks/useAuthz";
import { formatIsoDateLocal } from "@/utils/boardDates";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

function formatMoneyAmount(amount: string, currency: string | null): string {
  const n = Number(amount.replace(",", "."));
  if (Number.isNaN(n)) {
    return currency !== null ? `${amount} ${currency}` : amount;
  }
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
  return currency !== null ? `${formatted} ${currency}` : formatted;
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? "";
  const canWriteFolio = useCanWriteBookings();
  const { data: properties } = useProperties();
  const { data: rooms } = useRooms();
  const { data: roomTypes } = useRoomTypes();

  const {
    data: booking,
    isPending: bookingPending,
    isError: bookingError,
    error: bookingErr,
  } = useBooking(bookingId);

  const { data: folio, isPending: folioPending, isError: folioError } =
    useBookingFolio(bookingId || undefined);

  const folioEntryMutation = useFolioEntry();
  const deleteTxMutation = useFolioDeleteTransaction();
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
  const [cancelReason, setCancelReason] = useState("");

  async function submitCharge(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFolioFormError(null);
    const amt = chargeAmount.trim();
    if (amt === "" || bookingId === "") {
      setFolioFormError("Укажите сумму.");
      return;
    }
    try {
      await folioEntryMutation.mutateAsync({
        bookingId,
        body: {
          entry_type: "charge",
          amount: amt,
          category: chargeCategory.trim() || "misc",
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

  function deleteTxLabel(err: unknown): string {
    const msg = formatApiError(err);
    if (msg.includes("404") || msg.includes("405")) {
      return "Удаление строки недоступно (API или политика фолио).";
    }
    return msg;
  }

  const propertyCurrency = useMemo(() => {
    if (booking === undefined || properties === undefined) {
      return null;
    }
    return (
      properties.find((p) => p.id === booking.property_id)?.currency ?? null
    );
  }, [booking, properties]);

  const roomLabel = useMemo(() => {
    if (booking === undefined || rooms === undefined) {
      return null;
    }
    if (booking.room_id === null) {
      return null;
    }
    const room = rooms.find((r) => r.id === booking.room_id);
    return room?.name ?? null;
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
    return roomTypes.find((t) => t.id === booking.room_type_id)?.name ?? null;
  }, [booking, roomTypes]);

  const bookingTitle = useMemo(() => {
    if (booking === undefined) {
      return `Бронь ${bookingId.slice(0, 8)}…`;
    }
    const who = `${booking.guest.last_name} ${booking.guest.first_name}`.trim();
    const roomBit =
      roomLabel !== null
        ? ` · комн. ${roomLabel}`
        : roomTypeLabel !== null
          ? ` · ${roomTypeLabel}`
          : "";
    return `Бронь: ${who}${roomBit}`;
  }, [booking, bookingId, roomLabel, roomTypeLabel]);

  const bookingStatus = booking?.status.trim().toLowerCase() ?? "";
  const allowedTransitions = ALLOWED_TRANSITIONS[bookingStatus] ?? [];
  const canShowStatusActions =
    canWriteFolio &&
    booking !== undefined &&
    allowedTransitions.length > 0;

  if (bookingId === "") {
    return (
      <p className="text-sm text-muted-foreground">Не указан id брони.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/bookings">← К списку</Link>
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{bookingTitle}</h2>
        {showApiRouteHints() ? (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            id: {bookingId}
          </p>
        ) : null}
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
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Гость</dt>
                <dd className="font-medium">
                  {booking.guest.last_name} {booking.guest.first_name}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Статус</dt>
                <dd>{bookingStatusLabel(booking.status)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Заезд / выезд</dt>
                <dd className="tabular-nums">
                  {booking.check_in_date ?? "—"} →{" "}
                  {booking.check_out_date ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Сумма брони</dt>
                <dd className="tabular-nums">
                  {formatMoneyAmount(booking.total_amount, propertyCurrency)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">
              <Link
                to="/audit-log"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Журнал аудита
              </Link>
              {" — "}
              там могут быть записи по этой брони (поиск по ID сущности).
            </p>
            {patchBookingMutation.isError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {formatApiError(patchBookingMutation.error)}
              </p>
            ) : null}
            {canShowStatusActions ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Действия с бронью
                </span>
                <ApiRouteHint>
                  <code className="rounded bg-muted px-1 font-mono text-[10px]">
                    PATCH /bookings/…
                  </code>
                </ApiRouteHint>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.includes("confirmed") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        patchBookingMutation.mutate({
                          status: "confirmed",
                        });
                      }}
                    >
                      Подтвердить
                    </Button>
                  ) : null}
                  {allowedTransitions.includes("checked_in") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        patchBookingMutation.mutate({
                          status: "checked_in",
                          check_in: formatIsoDateLocal(new Date()),
                        });
                      }}
                    >
                      Заезд (check-in)
                    </Button>
                  ) : null}
                  {allowedTransitions.includes("checked_out") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        patchBookingMutation.mutate({
                          status: "checked_out",
                          check_out: formatIsoDateLocal(new Date()),
                        });
                      }}
                    >
                      Выезд (check-out)
                    </Button>
                  ) : null}
                  {allowedTransitions.includes("no_show") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        patchBookingMutation.mutate({
                          status: "no_show",
                        });
                      }}
                    >
                      Не заехал (no-show)
                    </Button>
                  ) : null}
                  {allowedTransitions.includes("cancelled") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={patchBookingMutation.isPending}
                      onClick={() => {
                        patchBookingMutation.mutate({
                          status: "cancelled",
                          cancellation_reason:
                            cancelReason.trim() !== ""
                              ? cancelReason.trim()
                              : "Отмена с карточки брони",
                        });
                      }}
                    >
                      Отменить
                    </Button>
                  ) : null}
                </div>
                {allowedTransitions.includes("cancelled") ? (
                  <Input
                    placeholder="Причина отмены (необязательно)"
                    value={cancelReason}
                    onChange={(e) => {
                      setCancelReason(e.target.value);
                    }}
                    className="max-w-md"
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">Фолио</h3>
          {canWriteFolio && booking !== undefined ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFolioFormError(null);
                  setChargeOpen(true);
                }}
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Начисление
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFolioFormError(null);
                  setPaymentOpen(true);
                }}
              >
                <Banknote className="mr-1.5 h-4 w-4" />
                Оплата
              </Button>
            </div>
          ) : null}
        </div>
        {folioFormError !== null ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {folioFormError}
          </p>
        ) : null}
        {folioError ? (
          <p className="mt-2 text-sm text-destructive">
            Не удалось загрузить фолио.
          </p>
        ) : folioPending ? (
          <div
            className="mt-2 h-32 animate-pulse rounded-md bg-muted"
            aria-hidden
          />
        ) : folio === undefined ? null : (
          <div className="mt-2 space-y-2">
            <p className="text-sm">
              Баланс:{" "}
              <span className="font-semibold tabular-nums">
                {formatMoneyAmount(folio.balance, propertyCurrency)}
              </span>
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5">Дата</th>
                    <th className="px-2 py-1.5">Тип</th>
                    <th className="px-2 py-1.5">Категория</th>
                    <th className="px-2 py-1.5 text-right">Сумма</th>
                    {canWriteFolio ? (
                      <th className="px-2 py-1.5 text-right">Действия</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {folio.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                        {t.created_at.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1.5">
                        {folioTransactionTypeLabel(t.transaction_type)}
                      </td>
                      <td className="px-2 py-1.5">{t.category}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatMoneyAmount(t.amount, propertyCurrency)}
                      </td>
                      {canWriteFolio ? (
                        <td className="px-2 py-1.5 text-right">
                          {t.voidable === false ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive"
                              disabled={deleteTxMutation.isPending}
                              onClick={() => {
                                void (async () => {
                                  setFolioFormError(null);
                                  try {
                                    await deleteTxMutation.mutateAsync({
                                      bookingId,
                                      transactionId: t.id,
                                    });
                                  } catch (err) {
                                    setFolioFormError(deleteTxLabel(err));
                                  }
                                })();
                              }}
                            >
                              Сторно
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
          </div>
        )}
      </div>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitCharge(e)}>
            <DialogHeader>
              <DialogTitle>Начисление</DialogTitle>
              <DialogDescription>
                Добавить начисление в фолио брони.
              </DialogDescription>
              <ApiRouteHint>
                POST <code className="text-xs">/bookings/…/folio</code>, charge
              </ApiRouteHint>
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
                  placeholder="room, fb, misc…"
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка…
                  </>
                ) : (
                  "Добавить"
                )}
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
              <DialogDescription>
                Зарегистрировать оплату по фолио.
              </DialogDescription>
              <ApiRouteHint>
                POST <code className="text-xs">/bookings/…/folio</code>, payment
              </ApiRouteHint>
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
                <Input
                  id="pay-meth"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                  }}
                  placeholder="card, cash…"
                />
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка…
                  </>
                ) : (
                  "Провести оплату"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
