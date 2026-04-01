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
import { useApiKeys } from "@/hooks/useApiKeys";
import {
  useCreateApiKey,
  useDeactivateApiKey,
  useDeleteApiKey,
} from "@/hooks/useApiKeyMutations";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";

interface SettingsApiKeysSectionProps {
  canManage: boolean;
}

function parseScopes(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SettingsApiKeysSection({
  canManage,
}: SettingsApiKeysSectionProps) {
  const { data: keys, isPending, isError } = useApiKeys(canManage);
  const createMutation = useCreateApiKey();
  const deactivateMutation = useDeactivateApiKey();
  const deleteMutation = useDeleteApiKey();

  const [name, setName] = useState("");
  const [scopesRaw, setScopesRaw] = useState("read:bookings write:bookings");
  const [formError, setFormError] = useState<string | null>(null);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function onCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const n = name.trim();
    if (n === "") {
      setFormError("Укажите название ключа.");
      return;
    }
    const scopes = parseScopes(scopesRaw);
    if (scopes.length === 0) {
      setFormError("Укажите хотя бы одну область (scopes), через запятую.");
      return;
    }
    try {
      const res = await createMutation.mutateAsync({ name: n, scopes });
      setCreatedKey(res.key);
      setNewKeyOpen(true);
      setName("");
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">API-ключи</h3>
        <p className="text-sm text-muted-foreground">
          Управление ключами доступно ролям owner и manager.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">API-ключи</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /api-keys
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /api-keys
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            PATCH /api-keys/{"{"}id{"}"}
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            DELETE /api-keys/{"{"}id{"}"}
          </code>
          .
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить ключи.</p>
      ) : isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Активен</th>
                <th className="px-3 py-2 font-medium">Истекает</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(keys ?? []).map((k) => (
                <tr key={k.id} className="border-b border-border/80">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-muted-foreground">
                    {k.scopes?.join(", ") ?? "—"}
                  </td>
                  <td className="px-3 py-2">{k.is_active ? "да" : "нет"}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {k.expires_at !== null ? k.expires_at.slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {k.is_active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={deactivateMutation.isPending}
                          onClick={() => {
                            void deactivateMutation.mutateAsync(k.id);
                          }}
                        >
                          Деактивировать
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          setDeleteTarget({ id: k.id, name: k.name });
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
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
          Новый ключ
        </p>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="Название"
          />
          <Input
            value={scopesRaw}
            onChange={(e) => {
              setScopesRaw(e.target.value);
            }}
            placeholder="scopes через запятую"
          />
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Создание…" : "Создать ключ"}
        </Button>
      </form>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить ключ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Действие необратимо. Ключ «{deleteTarget?.name ?? ""}» будет удалён
            навсегда.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || deleteTarget === null}
              onClick={() => {
                if (deleteTarget === null) return;
                void (async () => {
                  try {
                    await deleteMutation.mutateAsync(deleteTarget.id);
                    toastSuccess("Ключ удалён");
                    setDeleteTarget(null);
                  } catch (err) {
                    toastError(formatApiError(err));
                  }
                })();
              }}
            >
              {deleteMutation.isPending ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newKeyOpen} onOpenChange={setNewKeyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Сохраните ключ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Полное значение показывается только сейчас.
          </p>
          {createdKey !== null ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {createdKey}
            </pre>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (createdKey === null) return;
                void (async () => {
                  try {
                    await copyToClipboard(createdKey);
                    toastSuccess("Ключ скопирован");
                  } catch {
                    toastError("Не удалось скопировать");
                  }
                })();
              }}
            >
              Копировать
            </Button>
            <Button type="button" onClick={() => setNewKeyOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
