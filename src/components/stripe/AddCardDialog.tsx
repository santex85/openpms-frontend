import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSavePaymentMethod } from "@/hooks/useStripePayments";
import { formatApiError } from "@/lib/formatApiError";
import { getStripePromise } from "@/lib/stripe";

interface AddCardFormProps {
  propertyId: string;
  bookingId: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

function AddCardForm({
  propertyId,
  bookingId,
  onSuccess,
  onClose,
}: AddCardFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const saveMut = useSavePaymentMethod();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements) {
      setError(t("stripe.addCard.stripeNotReady"));
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setError(t("stripe.addCard.noCard"));
      return;
    }
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });
    if (pmError) {
      setError(pmError.message ?? t("stripe.addCard.createFailed"));
      return;
    }
    if (!paymentMethod) {
      setError(t("stripe.addCard.createFailed"));
      return;
    }
    try {
      await saveMut.mutateAsync({
        propertyId,
        body: {
          stripe_pm_id: paymentMethod.id,
          booking_id: bookingId,
          label: label.trim() || null,
        },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="stripe-card-label"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("stripe.addCard.labelField")}
        </label>
        <Input
          id="stripe-card-label"
          value={label}
          onChange={(ev) => setLabel(ev.target.value)}
          placeholder={t("stripe.addCard.labelPlaceholder")}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium leading-none">
          {t("stripe.addCard.cardField")}
        </span>
        <div className="rounded-md border border-input bg-background px-3 py-2">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </div>
      {error !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={saveMut.isPending || !stripe}>
          {saveMut.isPending
            ? t("stripe.addCard.saving")
            : t("stripe.addCard.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  bookingId: string | null;
  onSuccess: () => void;
}

export function AddCardDialog({
  open,
  onOpenChange,
  propertyId,
  bookingId,
  onSuccess,
}: AddCardDialogProps) {
  const { t } = useTranslation();
  const stripePromise = useMemo(() => getStripePromise(), []);
  const hasKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("stripe.addCard.title")}</DialogTitle>
        </DialogHeader>
        {!hasKey ? (
          <p className="text-sm text-destructive" role="alert">
            {t("stripe.addCard.missingPublishableKey")}
          </p>
        ) : stripePromise === null ? (
          <p className="text-sm text-destructive" role="alert">
            {t("stripe.addCard.loadFailed")}
          </p>
        ) : (
          <Elements stripe={stripePromise}>
            <AddCardForm
              propertyId={propertyId}
              bookingId={bookingId}
              onSuccess={onSuccess}
              onClose={() => onOpenChange(false)}
            />
          </Elements>
        )}
        {!hasKey ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
