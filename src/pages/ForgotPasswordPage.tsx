import { FormEvent, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { postForgotPassword } from "@/api/auth";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/formatApiError";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await postForgotPassword(email);
      setSent(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setSent(true);
        return;
      }
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {t("auth.forgotPassword.title")}
          </h1>
          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <ApiRouteHint>POST /auth/forgot-password</ApiRouteHint>
          </p>
        </div>
        {sent ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t("auth.forgotPassword.sent")}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            {error !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "…" : t("auth.forgotPassword.submit")}
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
