import { FormEvent, useState } from "react";

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
import {
  useCreateWebhookSubscription,
  useDeleteWebhookSubscription,
} from "@/hooks/useWebhookMutations";
import {
  useWebhookDeliveryLogs,
  useWebhookSubscriptions,
} from "@/hooks/useWebhooks";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";

interface SettingsWebhooksSectionProps {
  canManage: boolean;
}

export function SettingsWebhooksSection({
  canManage,
}: SettingsWebhooksSectionProps) {
  const { data: subs, isPending: subsPending, isError: subsError } =
    useWebhookSubscriptions(canManage);
  const {
    data: logs,
    isPending: logsPending,
    isError: logsError,
  } = useWebhookDeliveryLogs(canManage);
  const createMutation = useCreateWebhookSubscription();
  const deleteMutation = useDeleteWebhookSubscription();

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
      setFormError("Укажите URL.");
      return;
    }
    const events = Array.from(selectedEvents);
    if (events.length === 0) {
      setFormError("Выберите хотя бы одно событие.");
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
        <h3 className="text-sm font-semibold text-foreground">Вебхуки</h3>
        <p className="text-sm text-muted-foreground">
          Подписки настраивают owner и manager.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Вебхуки</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /webhooks/subscriptions
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /webhooks/delivery-logs
          </code>
          .
        </p>
      </div>

      {subsError ? (
        <p className="text-sm text-destructive">Не удалось загрузить подписки.</p>
      ) : subsPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">События</th>
                <th className="px-3 py-2 font-medium">Активна</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(subs ?? []).map((h) => (
                <tr key={h.id} className="border-b border-border/80">
                  <td className="max-w-[200px] truncate px-3 py-2">{h.url}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {h.events.join(", ")}
                  </td>
                  <td className="px-3 py-2">{h.is_active ? "да" : "нет"}</td>
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
                      Удалить
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
          Новая подписка
        </p>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor="wh-url" className="text-sm font-medium">
            URL
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
          <legend className="text-sm font-medium">События</legend>
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
                  <span className="font-mono text-xs">{ev}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Сохранение…" : "Добавить подписку"}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Лог доставки
        </h4>
        {logsError ? (
          <p className="text-sm text-destructive">Не удалось загрузить лог.</p>
        ) : logsPending ? (
          <div className="h-20 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Время</th>
                  <th className="px-3 py-2 font-medium">Подписка</th>
                  <th className="px-3 py-2 font-medium">HTTP</th>
                  <th className="px-3 py-2 font-medium">Попытка</th>
                  <th className="px-3 py-2 font-medium">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      Записей нет
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
                        {row.http_status ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.attempt_number}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                        {row.error_message ?? "—"}
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
            <DialogTitle>Секрет подписи</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Используйте для проверки HMAC. Сохраните — больше не покажем.
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
                    toastSuccess("Секрет скопирован");
                  } catch {
                    toastError("Не удалось скопировать");
                  }
                })();
              }}
            >
              Копировать
            </Button>
            <Button type="button" onClick={() => setSecretModalOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
