import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthRole } from "@/hooks/useAuthz";
import { useCurrentUserQueryContext } from "@/hooks/useCurrentUserQueryContext";
import { useInviteUser } from "@/hooks/useInviteUser";
import { usePatchTenantUser } from "@/hooks/usePatchTenantUser";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatApiError } from "@/lib/formatApiError";
import { tenantRoleLabel } from "@/lib/i18n/domainLabels";
import { toastError, toastSuccess } from "@/lib/toast";

interface SettingsUsersSectionProps {
  canManage: boolean;
}

export function SettingsUsersSection({ canManage }: SettingsUsersSectionProps) {
  const { t, i18n } = useTranslation();
  const { data: me } = useCurrentUserQueryContext();
  const { data: users, isPending, isError } = useTenantUsers(canManage);
  const inviteMutation = useInviteUser();
  const patchUserMut = usePatchTenantUser();

  const authRole = useAuthRole();
  const patchRoleChoices = useMemo(() => {
    const actor = authRole;
    const base = [
      "manager",
      "receptionist",
      "housekeeping",
      "viewer",
    ] as const;
    if (actor === "owner") {
      return ["owner", ...base] as const;
    }
    return base;
  }, [authRole]);

  const roleInviteOptions = useMemo(
    () =>
      [
        { value: "manager", label: tenantRoleLabel("manager") },
        { value: "receptionist", label: tenantRoleLabel("receptionist") },
        { value: "housekeeping", label: tenantRoleLabel("housekeeping") },
      ] as const,
    [i18n.language]
  );

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>(roleInviteOptions[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [invitePasswordPayload, setInvitePasswordPayload] = useState<{
    email: string;
    temporary_password: string;
  } | null>(null);

  async function onInvite(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const em = email.trim();
    const fn = fullName.trim();
    if (em === "") {
      setFormError(t("settings.users.err.emailRequired"));
      return;
    }
    if (fn === "") {
      setFormError(t("settings.users.err.fullNameRequired"));
      return;
    }
    try {
      const res = await inviteMutation.mutateAsync({
        email: em,
        role,
        full_name: fn,
      });
      setInvitePasswordPayload({
        email: res.email,
        temporary_password: res.temporary_password,
      });
      setPasswordModalOpen(true);
      setEmail("");
      setFullName("");
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.users.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.users.noPermission")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.users.title")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("settings.users.intro")}</span>
          <ApiRouteHint>GET /auth/users</ApiRouteHint>
          <ApiRouteHint>PATCH /auth/users/{"{"}id{"}"}</ApiRouteHint>
          <ApiRouteHint>POST /auth/invite</ApiRouteHint>
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {t("settings.users.loadError")}
        </p>
      ) : isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("settings.users.colEmail")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.users.colName")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.users.colRole")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("settings.users.colActive")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => {
                const isSelf = me !== undefined && u.id === me.id;
                const activeDisabled =
                  patchUserMut.isPending || (isSelf && !u.is_active);
                return (
                  <tr key={u.id} className="border-b border-border/80">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={u.role}
                        disabled={patchUserMut.isPending}
                        onValueChange={(v) => {
                          void (async () => {
                            try {
                              await patchUserMut.mutateAsync({
                                userId: u.id,
                                body: { role: v },
                              });
                            } catch (err) {
                              if (axios.isAxiosError(err)) {
                                toastError(
                                  typeof err.response?.data?.detail === "string"
                                    ? err.response.data.detail
                                    : formatApiError(err)
                                );
                              }
                            }
                          })();
                        }}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {patchRoleChoices.map((r) => (
                            <SelectItem key={r} value={r}>
                              {tenantRoleLabel(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input"
                          checked={u.is_active}
                          disabled={activeDisabled || (isSelf && u.is_active)}
                          onChange={(e) => {
                            const next = e.target.checked;
                            void (async () => {
                              try {
                                await patchUserMut.mutateAsync({
                                  userId: u.id,
                                  body: { is_active: next },
                                });
                              } catch (err) {
                                if (axios.isAxiosError(err)) {
                                  toastError(
                                    typeof err.response?.data?.detail ===
                                      "string"
                                      ? err.response.data.detail
                                      : formatApiError(err)
                                  );
                                }
                              }
                            })();
                          }}
                        />
                        {u.is_active ? t("common.yes") : t("common.no")}
                      </label>
                      {isSelf && u.is_active ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {t("settings.users.cannotDeactivateSelf")}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="max-w-md space-y-3 border-t border-border pt-4"
        onSubmit={(e) => void onInvite(e)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("settings.users.inviteSection")}
        </p>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor="inv-email" className="text-sm font-medium">
            {t("settings.users.colEmail")}
          </label>
          <Input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inv-name" className="text-sm font-medium">
            {t("settings.users.fullName")}
          </label>
          <Input
            id="inv-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
            }}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">
            {t("settings.users.roleLabel")}
          </span>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger aria-label={t("settings.users.roleInviteAria")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleInviteOptions.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {inviteMutation.isPending
            ? t("settings.users.sending")
            : t("settings.users.sendInvite")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("settings.users.inviteHint")}
        </p>
      </form>

      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.users.tempPasswordTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.users.tempPasswordHint", {
              email: invitePasswordPayload?.email ?? "",
            })}
          </p>
          {invitePasswordPayload !== null ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
              {invitePasswordPayload.temporary_password}
            </pre>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (invitePasswordPayload === null) return;
                void (async () => {
                  try {
                    await copyToClipboard(
                      invitePasswordPayload.temporary_password
                    );
                    toastSuccess(t("settings.users.toastPasswordCopied"));
                  } catch {
                    toastError(t("common.copyFailed"));
                  }
                })();
              }}
            >
              {t("common.copy")}
            </Button>
            <Button type="button" onClick={() => setPasswordModalOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
