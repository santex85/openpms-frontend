import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WEBHOOK_EVENT_OPTIONS } from "@/constants/webhookEvents";
import { FernetKeyRotationPanel } from "@/components/settings/FernetKeyRotationPanel";
import { useAuthRole } from "@/hooks/useAuthz";
import {
  useCreateWebhookSubscription,
  useDeleteWebhookSubscription,
  usePatchWebhookSubscription,
} from "@/hooks/useWebhookMutations";
import {
  useWebhookDeliveryLogs,
  useWebhookSubscriptions,
} from "@/hooks/useWebhooks";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatApiError } from "@/lib/formatApiError";
import { webhookEventLabel } from "@/lib/i18n/domainLabels";
import { toastError, toastSuccess } from "@/lib/toast";

interface SettingsWebhooksSectionProps {
  canManage: boolean;
}

export function SettingsWebhooksSection({
  canManage,
}: SettingsWebhooksSectionProps) {
  const { t } = useTranslation();
  const authRole = useAuthRole();
  const {
    data: subs,
    isPending: subsPending,
    isError: subsError,
  } = useWebhookSubscriptions(canManage);
  const {
    data: logs,
    isPending: logsPending,
    isError: logsError,
  } = useWebhookDeliveryLogs(canManage);
  const createMutation = useCreateWebhookSubscription();
  const deleteMutation = useDeleteWebhookSubscription();
  const patchMutation = usePatchWebhookSubscription();

  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    () => new Set([WEBHOOK_EVENT_OPTIONS[0]])
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  function toggleEvent(ev: string): void {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) {
        next.delete(ev);
      } else {
        next.add(ev);
      }
      return next;
    });
  }

  async function onCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const u = url.trim();
    if (u === "") {
      setFormError(t("settings.webhooks.err.urlRequired"));
      return;
    }
    const events = Array.from(selectedEvents);
    if (events.length === 0) {
      setFormError(t("settings.webhooks.err.eventRequired"));
      return;
    }
    try {
      const res = await createMutation.mutateAsync({ url: u, events });
      setCreatedSecret(res.secret);
      setSecretModalOpen(true);
      setUrl("");
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.webhooks.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.webhooks.noPermission")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.webhooks.title")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("settings.webhooks.intro")}</span>
          <ApiRouteHint>GET /webhooks/subscriptions</ApiRouteHint>
          <ApiRouteHint>GET /webhooks/delivery-logs</ApiRouteHint>
          <ApiRouteHint>PATCH /webhooks/subscriptions/{"{"}id{"}"}</ApiRouteHint>
        </p>
      </div>

      {subsError ? (
        <p className="text-sm text-destructive">
          {t("settings.webhooks.loadSubsError")}
        </p>
      ) : subsPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("settings.webhooks.colUrl")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.webhooks.colEvents")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.webhooks.colActive")}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(subs ?? []).map((h) => (
                <tr key={h.id} className="border-b border-border/80">
                  <td className="max-w-[200px] truncate px-3 py-2">{h.url}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {h.events.map((ev) => webhookEventLabel(ev)).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={h.is_active}
                        disabled={
                          patchMutation.isPending &&
                          patchMutation.variables?.subscriptionId === h.id
                        }
                        onChange={(e) => {
                          void (async () => {
                            try {
                              await patchMutation.mutateAsync({
                                subscriptionId: h.id,
                                body: { is_active: e.target.checked },
                              });
                              toastSuccess(
                                e.target.checked
                                  ? t("settings.webhooks.toastEnabled")
                                  : t("settings.webhooks.toastDisabled")
                              );
                            } catch (err) {
                              toastError(formatApiError(err));
                            }
                          })();
                        }}
                      />
                      <span>
                        {h.is_active ? t("common.yes") : t("common.no")}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        void deleteMutation.mutateAsync(h.id);
                      }}
                    >
                      {t("common.delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="max-w-xl space-y-3 border-t border-border pt-4"
        onSubmit={(e) => void onCreate(e)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("settings.webhooks.newSubscription")}
        </p>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor="wh-url" className="text-sm font-medium">
            {t("settings.webhooks.colUrl")}
          </label>
          <Input
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            placeholder="https://example.com/hooks/openpms"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("settings.webhooks.colEvents")}
          </legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {WEBHOOK_EVENT_OPTIONS.map((ev) => (
              <li key={ev}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={selectedEvents.has(ev)}
                    onChange={() => {
                      toggleEvent(ev);
                    }}
                  />
                  <span className="text-sm">
                    {webhookEventLabel(ev)}
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      ({ev})
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending
            ? t("settings.webhooks.saving")
            : t("settings.webhooks.addSubscription")}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("settings.webhooks.deliveryLog")}
        </h4>
        {logsError ? (
          <p className="text-sm text-destructive">
            {t("settings.webhooks.loadLogError")}
          </p>
        ) : logsPending ? (
          <div className="h-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.webhooks.colTime")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.webhooks.colSubscription")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.webhooks.colHttp")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.webhooks.colAttempt")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.webhooks.colError")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      {t("settings.webhooks.logEmpty")}
                    </td>
                  </tr>
                ) : (
                  (logs ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/80">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {row.created_at.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {row.subscription_id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.http_status ?? t("common.notAvailable")}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.attempt_number}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                        {row.error_message ?? t("common.notAvailable")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={secretModalOpen} onOpenChange={setSecretModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.webhooks.secretTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.webhooks.secretHint")}
          </p>
          {createdSecret !== null ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {createdSecret}
            </pre>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (createdSecret === null) return;
                void (async () => {
                  try {
                    await copyToClipboard(createdSecret);
                    toastSuccess(t("settings.webhooks.toastSecretCopied"));
                  } catch {
                    toastError(t("common.copyFailed"));
                  }
                })();
              }}
            >
              {t("common.copy")}
            </Button>
            <Button type="button" onClick={() => setSecretModalOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManage && authRole === "owner" ? <FernetKeyRotationPanel /> : null}
    </section>
  );
}
