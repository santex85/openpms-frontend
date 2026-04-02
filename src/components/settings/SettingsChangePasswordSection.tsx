import { FormEvent, useState } from "react";
import axios from "axios";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChangePassword } from "@/hooks/useChangePassword";

const MIN_LEN = 8;

function formatChangePasswordError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
  }
  return "Проверьте текущий пароль и повторите попытку.";
}

export function SettingsChangePasswordSection() {
  const mutation = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (current === "" || next === "" || confirm === "") {
      setError("Заполните все поля.");
      return;
    }
    if (next.length < MIN_LEN) {
      setError(`Новый пароль: минимум ${MIN_LEN} символов.`);
      return;
    }
    if (next !== confirm) {
      setError("Новый пароль и подтверждение не совпадают.");
      return;
    }

    try {
      await mutation.mutateAsync({
        current_password: current,
        new_password: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(formatChangePasswordError(err));
    }
  }

  return (
    <section
      id="account-password"
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Пароль аккаунта
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Смена текущего пароля.</span>
          <ApiRouteHint>POST /auth/change-password</ApiRouteHint>
        </p>
      </div>
      <form className="max-w-md space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {error !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="pw-current" className="text-sm font-medium">
            Текущий пароль
          </label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="pw-new" className="text-sm font-medium">
            Новый пароль
          </label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="pw-confirm" className="text-sm font-medium">
            Подтверждение
          </label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
            }}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Сохраняем…" : "Сменить пароль"}
        </Button>
      </form>
    </section>
  );
}
