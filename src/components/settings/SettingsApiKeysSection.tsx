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
  const { t } = useTranslation();
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
      setFormError(t("settings.apiKeys.err.nameRequired"));
      return;
    }
    const scopes = parseScopes(scopesRaw);
    if (scopes.length === 0) {
      setFormError(t("settings.apiKeys.err.scopesRequired"));
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
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.apiKeys.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.apiKeys.noPermission")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.apiKeys.title")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("settings.apiKeys.intro")}</span>
          <ApiRouteHint>GET /api-keys</ApiRouteHint>
          <ApiRouteHint>POST /api-keys</ApiRouteHint>
          <ApiRouteHint>PATCH /api-keys/{"{"}id{"}"}</ApiRouteHint>
          <ApiRouteHint>DELETE /api-keys/{"{"}id{"}"}</ApiRouteHint>
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {t("settings.apiKeys.loadError")}
        </p>
      ) : isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("settings.apiKeys.colName")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.apiKeys.colScopes")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.apiKeys.colActive")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.apiKeys.colExpires")}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(keys ?? []).map((k) => (
                <tr key={k.id} className="border-b border-border/80">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-muted-foreground">
                    {k.scopes?.join(", ") ?? t("common.notAvailable")}
                  </td>
                  <td className="px-3 py-2">
                    {k.is_active ? t("common.yes") : t("common.no")}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {k.expires_at !== null
                      ? k.expires_at.slice(0, 10)
                      : t("common.notAvailable")}
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
                          {t("settings.apiKeys.deactivate")}
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
                        {t("common.delete")}
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
          {t("settings.apiKeys.newKey")}
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
            placeholder={t("settings.apiKeys.namePh")}
          />
          <Input
            value={scopesRaw}
            onChange={(e) => {
              setScopesRaw(e.target.value);
            }}
            placeholder={t("settings.apiKeys.scopesPh")}
          />
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending
            ? t("settings.apiKeys.creating")
            : t("settings.apiKeys.create")}
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
            <DialogTitle>{t("settings.apiKeys.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.apiKeys.deleteBody", {
              name: deleteTarget?.name ?? "",
            })}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              {t("common.cancel")}
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
                    toastSuccess(t("settings.apiKeys.toastDeleted"));
                    setDeleteTarget(null);
                  } catch (err) {
                    toastError(formatApiError(err));
                  }
                })();
              }}
            >
              {deleteMutation.isPending
                ? t("settings.apiKeys.deleteConfirmDeleting")
                : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newKeyOpen} onOpenChange={setNewKeyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.apiKeys.saveKeyTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.apiKeys.saveKeyHint")}
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
                    toastSuccess(t("settings.apiKeys.toastCopied"));
                  } catch {
                    toastError(t("common.copyFailed"));
                  }
                })();
              }}
            >
              {t("common.copy")}
            </Button>
            <Button type="button" onClick={() => setNewKeyOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
