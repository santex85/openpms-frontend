import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { postResetPassword } from "@/api/auth";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/formatApiError";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => (searchParams.get("token") ?? "").trim(),
    [searchParams]
  );
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    if (token === "") {
      setError(t("auth.forgotPassword.tokenMissing"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.forgotPassword.error"));
      return;
    }
    if (password !== password2) {
      setError(t("auth.forgotPassword.error"));
      return;
    }
    setPending(true);
    try {
      await postResetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  if (token === "") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive" role="alert">
            {t("auth.forgotPassword.tokenMissing")}
          </p>
          <Link
            to="/forgot-password"
            className="font-medium text-primary underline underline-offset-2"
          >
            {t("auth.forgotPassword.title")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {t("auth.forgotPassword.resetTitle")}
          </h1>
          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <ApiRouteHint>POST /auth/reset-password</ApiRouteHint>
          </p>
        </div>
        {done ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {t("auth.forgotPassword.success")}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            {error !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="reset-pass" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="reset-pass"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reset-pass2" className="text-sm font-medium">
                Confirm
              </label>
              <Input
                id="reset-pass2"
                name="password2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value);
                }}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "…" : t("auth.forgotPassword.resetSubmit")}
            </Button>
          </form>
        )}
        <p className="text-center text-sm">
          <Link
            to="/login"
            className="font-medium text-primary underline underline-offset-2"
          >
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
