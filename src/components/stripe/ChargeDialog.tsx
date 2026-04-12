import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { useChargeBooking } from "@/hooks/useStripeCharges";
import { usePaymentMethods } from "@/hooks/useStripePayments";
import { formatApiError } from "@/lib/formatApiError";

interface ChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  bookingId: string;
  onAddCardRequest: () => void;
}

export function ChargeDialog({
  open,
  onOpenChange,
  propertyId,
  bookingId,
  onAddCardRequest,
}: ChargeDialogProps) {
  const { t } = useTranslation();
  const pmQ = usePaymentMethods(propertyId, null, open && Boolean(propertyId));
  const chargeMut = useChargeBooking();
  const [pmId, setPmId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    const rows = pmQ.data ?? [];
    if (rows.length === 0) {
      return;
    }
    setPmId((prev) => (prev === "" ? rows[0]!.id : prev));
  }, [open, pmQ.data]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const a = amount.trim();
    if (a === "") {
      setError(t("stripe.charge.amountRequired"));
      return;
    }
    if (pmId === "") {
      setError(t("stripe.charge.pickCard"));
      return;
    }
    try {
      await chargeMut.mutateAsync({
        bookingId,
        body: {
          stripe_pm_id: pmId,
          amount: a,
          label: label.trim() || null,
        },
      });
      onOpenChange(false);
      setAmount("");
      setLabel("");
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  const rows = pmQ.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("stripe.charge.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("stripe.charge.card")}</span>
            {pmQ.isPending ? (
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("stripe.charge.noCards")}{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    onOpenChange(false);
                    onAddCardRequest();
                  }}
                >
                  {t("stripe.charges.addCard")}
                </button>
              </p>
            ) : (
              <Select value={pmId} onValueChange={setPmId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("stripe.charge.pickCard")} />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label?.trim() ||
                        `${r.card_brand ?? "card"} …${r.card_last4 ?? "????"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="charge-amount" className="text-sm font-medium">
              {t("stripe.charge.amount")}
            </label>
            <Input
              id="charge-amount"
              inputMode="decimal"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="charge-label" className="text-sm font-medium">
              {t("stripe.charge.memo")}
            </label>
            <Input
              id="charge-label"
              value={label}
              onChange={(ev) => setLabel(ev.target.value)}
              placeholder={t("stripe.charge.memoPlaceholder")}
              autoComplete="off"
            />
          </div>
          {error !== null ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                chargeMut.isPending || rows.length === 0 || pmId === ""
              }
            >
              {chargeMut.isPending
                ? t("stripe.charge.charging")
                : t("stripe.charges.charge")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
