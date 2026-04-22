import {
  FormEvent,
  useLayoutEffect,
  useState,
} from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { loginRequest } from "@/api/auth";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessToken, setSession } from "@/lib/authSession";
import { queryClient } from "@/lib/queryClient";
import { usePropertyStore } from "@/stores/property-store";

function shouldParseDevTokenHash(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    window.location.hash.startsWith("#dev_token=")
  );
}

function parseJwtTenantId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as { tenant_id?: string };
    return typeof payload.tenant_id === "string" ? payload.tenant_id : null;
  } catch {
    return null;
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [devHashResolved, setDevHashResolved] = useState(
    () => !shouldParseDevTokenHash()
  );

  useLayoutEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    if (!window.location.hash.startsWith("#dev_token=")) {
      return;
    }
    try {
      const encoded = window.location.hash.slice("#dev_token=".length);
      const token = decodeURIComponent(encoded).trim();
      if (token !== "") {
        const tid = parseJwtTenantId(token);
        if (tid !== null) {
          setSession(token, tid);
          queryClient.clear();
          usePropertyStore.getState().setSelectedPropertyId(null);
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          const from =
            (location.state as { from?: string } | null)?.from ?? "/";
          navigate(from, { replace: true });
          return;
        }
      }
    } catch {
      /* invalid fragment */
    }
    setDevHashResolved(true);
  }, [navigate, location.state]);

  if (!devHashResolved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Вход…</p>
      </div>
    );
  }

  const tok = getAccessToken();
  if (tok !== null && tok !== "") {
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    try {
      await loginRequest(email.trim(), password);
      usePropertyStore.getState().setSelectedPropertyId(null);
      navigate(from, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data !== undefined) {
        const data = err.response.data as { detail?: unknown };
        if (typeof data.detail === "string") {
          setError(data.detail);
        } else {
          setError("Не удалось войти");
        }
      } else {
        setError("Не удалось войти");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">OpenPMS</h1>
          <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Вход по email и паролю.</span>
            <ApiRouteHint>POST /auth/login</ApiRouteHint>
          </p>
        </div>
        {import.meta.env.DEV ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Dev: одноразовый JWT без cookie —{" "}
            <code className="font-mono text-foreground">npm run mint:jwt</code>{" "}
            и ссылка с{" "}
            <code className="font-mono text-foreground">#dev_token=</code>.
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error !== null ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Пароль
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                {t("auth.forgotPassword.link")}
              </Link>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Входим…" : "Войти"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link
            to="/register"
            className="font-medium text-primary underline underline-offset-2"
          >
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  );
}
