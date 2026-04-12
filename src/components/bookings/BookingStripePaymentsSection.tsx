import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AddCardDialog } from "@/components/stripe/AddCardDialog";
import { ChargeDialog } from "@/components/stripe/ChargeDialog";
import { RefundDialog } from "@/components/stripe/RefundDialog";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { useAuthRole } from "@/hooks/useAuthz";
import { useBookingStripeCharges } from "@/hooks/useStripeCharges";
import { useStripeStatus } from "@/hooks/useStripeConnect";
import { formatMoneyAmount } from "@/lib/formatMoney";
import { cn } from "@/lib/utils";
import type { ChargeRead } from "@/types/stripe";

interface BookingStripePaymentsSectionProps {
  bookingId: string;
  propertyId: string;
  propertyCurrency: string;
  canStripeCharge: boolean;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "succeeded":
      return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/15 text-destructive";
    case "refunded":
      return "bg-muted text-muted-foreground";
    case "partial_refund":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    default:
      return "bg-muted text-foreground";
  }
}

export function BookingStripePaymentsSection({
  bookingId,
  propertyId,
  propertyCurrency,
  canStripeCharge,
}: BookingStripePaymentsSectionProps) {
  const { t, i18n } = useTranslation();
  const role = useAuthRole();
  const isOwner = role === "owner";

  const statusQ = useStripeStatus(propertyId, true);
  const connected = statusQ.data?.status === "connected";

  const chargesQ = useBookingStripeCharges(
    bookingId,
    connected && Boolean(bookingId)
  );

  const [chargeOpen, setChargeOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundCharge, setRefundCharge] = useState<ChargeRead | null>(null);

  const rows = chargesQ.data ?? [];

  function paymentMethodLabel(c: ChargeRead): string {
    const pm = c.stripe_pm_id?.trim();
    if (!pm) {
      return "—";
    }
    return pm.length > 18 ? `${pm.slice(0, 16)}…` : pm;
  }

  if (!connected) {
    return null;
  }

  if (statusQ.isPending || chargesQ.isPending) {
    return (
      <section className="space-y-2 print:break-inside-avoid">
        <h3 className="text-base font-semibold text-foreground">
          {t("stripe.charges.title")}
        </h3>
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      </section>
    );
  }

  if (chargesQ.isError) {
    return (
      <section className="space-y-2 print:break-inside-avoid">
        <h3 className="text-base font-semibold text-foreground">
          {t("stripe.charges.title")}
        </h3>
        <p className="text-sm text-destructive">
          {t("stripe.charges.loadError")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {t("stripe.charges.title")}
        </h3>
        <div className="flex flex-wrap gap-2 print:hidden">
          {canStripeCharge ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAddCardOpen(true)}
              >
                {t("stripe.charges.addCard")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setChargeOpen(true)}
              >
                {t("stripe.charges.charge")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <ApiRouteHint className="print:hidden">
        {`GET /bookings/{id}/stripe/charges`}
      </ApiRouteHint>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("stripe.charges.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-2 py-1.5">{t("stripe.charges.date")}</th>
                <th className="px-2 py-1.5">{t("stripe.charges.card")}</th>
                <th className="px-2 py-1.5 text-right">
                  {t("stripe.charges.amount")}
                </th>
                <th className="px-2 py-1.5">{t("stripe.charges.status")}</th>
                <th className="px-2 py-1.5">{t("stripe.charges.details")}</th>
                <th className="px-2 py-1.5 text-right print:hidden">
                  {t("stripe.charges.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                    {c.created_at.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs">
                    {paymentMethodLabel(c)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatMoneyAmount(
                      propertyCurrency,
                      c.amount,
                      i18n.language
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                        statusBadgeClass(c.status)
                      )}
                    >
                      {t(`stripe.charges.statusValues.${c.status}`, c.status)}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate px-2 py-1.5 text-muted-foreground">
                    {c.failure_message?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right print:hidden">
                    {c.status === "succeeded" && isOwner ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => {
                          setRefundCharge(c);
                          setRefundOpen(true);
                        }}
                      >
                        {t("stripe.charges.refund")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddCardDialog
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        propertyId={propertyId}
        bookingId={bookingId}
        onSuccess={() => {
          void chargesQ.refetch();
        }}
      />

      <ChargeDialog
        open={chargeOpen}
        onOpenChange={setChargeOpen}
        propertyId={propertyId}
        bookingId={bookingId}
        onAddCardRequest={() => setAddCardOpen(true)}
      />

      <RefundDialog
        open={refundOpen}
        onOpenChange={(open) => {
          setRefundOpen(open);
          if (!open) {
            setRefundCharge(null);
          }
        }}
        bookingId={bookingId}
        charge={refundCharge}
      />
    </section>
  );
}
