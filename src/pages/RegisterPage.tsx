import { FormEvent, useState } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { registerRequest } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ONBOARDING_STEP_STORAGE_KEY,
  POST_REGISTER_STORAGE_KEY,
} from "@/lib/constants";
import { getAccessToken } from "@/lib/authSession";
import { usePropertyStore } from "@/stores/property-store";

export function RegisterPage() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const tok = getAccessToken();
  if (tok !== null && tok !== "") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await registerRequest({
        tenant_name: tenantName,
        full_name: fullName,
        email,
        password,
      });
      usePropertyStore.getState().setSelectedPropertyId(null);
      try {
        localStorage.setItem(POST_REGISTER_STORAGE_KEY, "1");
        localStorage.setItem(ONBOARDING_STEP_STORAGE_KEY, "0");
      } catch {
        /* ignore */
      }
      navigate("/onboarding", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data !== undefined) {
        const data = err.response.data as { detail?: unknown };
        if (typeof data.detail === "string") {
          setError(data.detail);
        } else {
          setError("Не удалось зарегистрироваться");
        }
      } else {
        setError("Не удалось зарегистрироваться");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">Регистрация</h1>
          <p className="text-sm text-muted-foreground">
            Новая организация и учётная запись (POST /auth/register).
          </p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error !== null ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor="tenant_name"
              className="text-sm font-medium text-foreground"
            >
              Название организации
            </label>
            <Input
              id="tenant_name"
              name="tenant_name"
              type="text"
              autoComplete="organization"
              value={tenantName}
              onChange={(e) => {
                setTenantName(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="full_name"
              className="text-sm font-medium text-foreground"
            >
              Полное имя
            </label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
              }}
              required
            />
          </div>
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
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Создаём…" : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline underline-offset-2"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
