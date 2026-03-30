import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateWebhook,
  useDeleteWebhook,
} from "@/hooks/useWebhookMutations";
import { useWebhooks } from "@/hooks/useWebhooks";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";

interface SettingsWebhooksSectionProps {
  canManage: boolean;
}

export function SettingsWebhooksSection({
  canManage,
}: SettingsWebhooksSectionProps) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: hooks, isPending, isError } = useWebhooks(
    canManage ? selectedPropertyId : null
  );
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();

  const [url, setUrl] = useState("");
  const [eventsRaw, setEventsRaw] = useState("booking.created,booking.updated");
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (selectedPropertyId === null) {
      setFormError("Выберите отель в шапке.");
      return;
    }
    const u = url.trim();
    if (u === "") {
      setFormError("Укажите URL.");
      return;
    }
    const events = eventsRaw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (events.length === 0) {
      setFormError("Укажите хотя бы одно событие через запятую.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        propertyId: selectedPropertyId,
        body: { url: u, events },
      });
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
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Вебхуки</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET/POST /webhooks
          </code>
          , события — массив строк (см. документацию API).
        </p>
      </div>

      {selectedPropertyId === null ? (
        <p className="text-sm text-muted-foreground">
          Выберите отель в шапке.
        </p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить вебхуки.
        </p>
      ) : isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">События</th>
                <th className="px-3 py-2 font-medium">Активен</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(hooks ?? []).map((h) => (
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
                        void deleteMutation.mutateAsync({
                          webhookId: h.id,
                          propertyId: selectedPropertyId,
                        });
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
        <div className="space-y-1">
          <label htmlFor="wh-events" className="text-sm font-medium">
            События через запятую
          </label>
          <Input
            id="wh-events"
            value={eventsRaw}
            onChange={(e) => {
              setEventsRaw(e.target.value);
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={
            createMutation.isPending || selectedPropertyId === null
          }
        >
          {createMutation.isPending ? "Сохранение…" : "Добавить вебхук"}
        </Button>
      </form>
    </section>
  );
}
