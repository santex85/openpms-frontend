import { FormEvent, useState } from "react";
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
import { useRefundCharge } from "@/hooks/useStripeCharges";
import { formatApiError } from "@/lib/formatApiError";
import type { ChargeRead } from "@/types/stripe";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  charge: ChargeRead | null;
}

export function RefundDialog({
  open,
  onOpenChange,
  bookingId,
  charge,
}: RefundDialogProps) {
  const { t } = useTranslation();
  const refundMut = useRefundCharge();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!charge) {
      return;
    }
    setError(null);
    const trimmed = amount.trim();
    try {
      await refundMut.mutateAsync({
        bookingId,
        body: {
          stripe_charge_id: charge.id,
          amount: trimmed === "" ? null : trimmed,
        },
      });
      onOpenChange(false);
      setAmount("");
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  if (!charge) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("stripe.refund.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("stripe.refund.hint", {
            amount: charge.amount,
            currency: charge.currency,
          })}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="refund-amount" className="text-sm font-medium">
              {t("stripe.refund.amount")}
            </label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              placeholder={t("stripe.refund.amountPlaceholder")}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t("stripe.refund.amountHelp")}
            </p>
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
            <Button type="submit" variant="destructive" disabled={refundMut.isPending}>
              {refundMut.isPending
                ? t("stripe.refund.refunding")
                : t("stripe.charges.refund")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
