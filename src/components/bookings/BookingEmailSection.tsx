import type { TFunction } from "i18next";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Loader2, Mail, RotateCcw } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  useBookingEmailLogs,
  useRetryEmailLog,
  useSendBookingInvoice,
} from "@/hooks/useBookingEmailLogs";
import { showApiRouteHints } from "@/lib/devUi";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { EmailLogRead } from "@/types/email-log";

interface BookingEmailSectionProps {
  bookingId: string;
  canWriteBookings: boolean;
}

function formatSentAt(iso: string): string {
  if (iso.length >= 19) {
    return iso.slice(0, 19).replace("T", " ");
  }
  return iso;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "sent":
      return "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-foreground";
  }
}

function emailStatusLabel(t: TFunction, status: string): string {
  if (status === "sent") {
    return t("booking.emails.statusSent");
  }
  if (status === "failed") {
    return t("booking.emails.statusFailed");
  }
  return t("booking.emails.statusOther", { status });
}

export function BookingEmailSection({
  bookingId,
  canWriteBookings,
}: BookingEmailSectionProps) {
  const { t } = useTranslation();
  const logsQ = useBookingEmailLogs(bookingId);
  const sendInvMut = useSendBookingInvoice();
  const retryMut = useRetryEmailLog(bookingId);

  const rows: EmailLogRead[] = logsQ.data ?? [];

  async function onSendInvoice(): Promise<void> {
    try {
      await sendInvMut.mutateAsync(bookingId);
      toastSuccess(t("booking.emails.invoiceQueued"));
    } catch (err) {
      toastError(formatApiError(err));
    }
  }

  return (
    <section className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {t("booking.emails.title")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {canWriteBookings ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={sendInvMut.isPending}
              onClick={() => {
                void onSendInvoice();
              }}
            >
              {sendInvMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Mail className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {t("booking.emails.sendInvoice")}
            </Button>
          ) : null}
        </div>
      </div>

      {showApiRouteHints() ? (
        <ApiRouteHint>
          {`GET /bookings/{id}/email-logs · POST /bookings/{id}/send-invoice · POST /email-logs/{id}/retry`}
        </ApiRouteHint>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Trans
          i18nKey="booking.emails.resendHint"
          components={{
            a: (
              <Link
                to="/settings#notifications"
                className="font-medium text-primary underline underline-offset-2"
              />
            ),
          }}
        />
      </p>

      {logsQ.isError ? (
        <p className="text-sm text-destructive">
          {t("booking.emails.loadError")}
        </p>
      ) : logsQ.isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("booking.emails.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-2 py-1.5">{t("booking.emails.sentAt")}</th>
                <th className="px-2 py-1.5">{t("booking.emails.template")}</th>
                <th className="px-2 py-1.5">{t("booking.emails.recipient")}</th>
                <th className="px-2 py-1.5">{t("booking.emails.subject")}</th>
                <th className="px-2 py-1.5">{t("booking.emails.status")}</th>
                {canWriteBookings ? (
                  <th className="px-2 py-1.5">{t("booking.emails.actions")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                    {formatSentAt(row.sent_at)}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs">
                    {row.template_name}
                  </td>
                  <td className="max-w-[200px] truncate px-2 py-1.5">
                    {row.to_address}
                  </td>
                  <td className="max-w-[220px] truncate px-2 py-1.5 text-muted-foreground">
                    {row.subject.trim() !== "" ? row.subject : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                        statusBadgeClass(row.status)
                      )}
                      title={
                        row.error_message?.trim()
                          ? row.error_message
                          : undefined
                      }
                    >
                      {emailStatusLabel(t, row.status)}
                    </span>
                  </td>
                  {canWriteBookings ? (
                    <td className="px-2 py-1.5">
                      {row.status === "failed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={retryMut.isPending}
                          onClick={() => {
                            void (async () => {
                              try {
                                await retryMut.mutateAsync(row.id);
                                toastSuccess(t("booking.emails.retryQueued"));
                              } catch (err) {
                                toastError(formatApiError(err));
                              }
                            })();
                          }}
                        >
                          {retryMut.isPending ? (
                            <Loader2
                              className="mr-1 h-3.5 w-3.5 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                          )}
                          {t("booking.emails.retry")}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
