import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { ExtensionCreateModal } from "@/components/settings/ExtensionCreateModal";
import { Button } from "@/components/ui/button";
import {
  useCountryPackExtensions,
  useDeleteCountryPackExtension,
} from "@/hooks/useCountryPackExtensions";
import { formatApiError } from "@/lib/formatApiError";

interface SettingsCountryPackExtensionsSectionProps {
  canManage: boolean;
}

export function SettingsCountryPackExtensionsSection({
  canManage,
}: SettingsCountryPackExtensionsSectionProps) {
  const { t } = useTranslation();
  const { data: rows, isPending, isError, error } =
    useCountryPackExtensions(canManage);
  const deleteMut = useDeleteCountryPackExtension();
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("extensions.settings.sectionTitle")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {t("extensions.settings.intro")}
          <ApiRouteHint>GET /country-packs/extensions</ApiRouteHint>
        </p>
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          {t("extensions.settings.noPermission")}
        </p>
      ) : isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              {t("extensions.settings.add")}
            </Button>
          </div>
          {actionError !== null ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          {isPending ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : (rows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("extensions.settings.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      {t("extensions.settings.colCode")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("extensions.settings.colName")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("extensions.settings.colCountry")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("extensions.settings.colUrl")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("extensions.settings.colRequired")}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {t("extensions.settings.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/70">
                      <td className="px-3 py-2 font-mono text-xs font-medium">
                        {row.code}
                      </td>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {row.country_code ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                        {row.webhook_url}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.required_fields.length === 0
                          ? "—"
                          : row.required_fields.join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            setActionError(null);
                            void (async () => {
                              try {
                                await deleteMut.mutateAsync(row.id);
                              } catch (e) {
                                setActionError(formatApiError(e));
                              }
                            })();
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
        </>
      )}

      <ExtensionCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}
