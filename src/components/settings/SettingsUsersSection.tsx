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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInviteUser } from "@/hooks/useInviteUser";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";

const ROLE_OPTIONS = [
  { value: "manager", label: "manager" },
  { value: "receptionist", label: "receptionist" },
  { value: "housekeeping", label: "housekeeping" },
] as const;

interface SettingsUsersSectionProps {
  canManage: boolean;
}

export function SettingsUsersSection({ canManage }: SettingsUsersSectionProps) {
  const { data: users, isPending, isError } = useTenantUsers(canManage);
  const inviteMutation = useInviteUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0].value);
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
      setFormError("Укажите email.");
      return;
    }
    if (fn === "") {
      setFormError("Укажите полное имя (full_name).");
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
        <h3 className="text-sm font-semibold text-foreground">Пользователи</h3>
        <p className="text-sm text-muted-foreground">
          Список и приглашения доступны ролям owner и manager.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Пользователи</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /auth/users
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /auth/invite
          </code>
          .
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить пользователей.
        </p>
      ) : isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Роль</th>
                <th className="px-3 py-2 font-medium">Активен</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/80">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.full_name}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.is_active ? "да" : "нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="max-w-md space-y-3 border-t border-border pt-4"
        onSubmit={(e) => void onInvite(e)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Пригласить пользователя
        </p>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor="inv-email" className="text-sm font-medium">
            Email
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
            Полное имя (full_name)
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
          <span className="text-sm font-medium">Роль</span>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger aria-label="Роль приглашения">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? "Отправка…" : "Отправить приглашение"}
        </Button>
      </form>

      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Временный пароль</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Сообщите пользователю{" "}
            <span className="font-medium text-foreground">
              {invitePasswordPayload?.email}
            </span>{" "}
            одноразовый пароль. При следующем входе попросите сменить пароль.
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
                    toastSuccess("Пароль скопирован");
                  } catch {
                    toastError("Не удалось скопировать");
                  }
                })();
              }}
            >
              Копировать
            </Button>
            <Button type="button" onClick={() => setPasswordModalOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
