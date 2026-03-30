import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { formatApiError } from "@/lib/formatApiError";
import { canWriteBookingsFromToken } from "@/lib/jwtPayload";
import { formatIsoDateLocal } from "@/utils/boardDates";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = id ?? "";
  const canWriteFolio = canWriteBookingsFromToken();

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

  const bookingStatus = booking?.status.trim().toLowerCase() ?? "";
  const canChangeStatus =
    canWriteFolio &&
    booking !== undefined &&
    bookingStatus !== "cancelled";

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
        <h2 className="text-lg font-semibold text-foreground">
          Бронь {bookingId.slice(0, 8)}…
        </h2>
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
                <dd>{booking.status}</dd>
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
                <dd className="tabular-nums">{booking.total_amount}</dd>
              </div>
            </dl>
            {patchBookingMutation.isError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {formatApiError(patchBookingMutation.error)}
              </p>
            ) : null}
            {canChangeStatus ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Действия с бронью (PATCH /bookings/…)
                </span>
                <div className="flex flex-wrap gap-2">
                  {bookingStatus !== "checked_in" &&
                  bookingStatus !== "checked_out" ? (
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
                  {bookingStatus === "checked_in" ? (
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
                  {bookingStatus !== "cancelled" ? (
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
                {bookingStatus !== "cancelled" ? (
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
              <span className="font-semibold tabular-nums">{folio.balance}</span>
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
                      <td className="px-2 py-1.5">{t.transaction_type}</td>
                      <td className="px-2 py-1.5">{t.category}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {t.amount}
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
                POST{" "}
                <code className="text-xs">/bookings/…/folio</code> с{" "}
                <code className="text-xs">entry_type=charge</code>
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
              <DialogDescription>
                POST <code className="text-xs">/bookings/…/folio</code> с{" "}
                <code className="text-xs">entry_type=payment</code>
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
                {folioEntryMutation.isPending ? "Отправка…" : "Провести оплату"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
