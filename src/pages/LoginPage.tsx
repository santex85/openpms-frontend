import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_STORAGE_KEY, MVP_DEMO_TOKEN } from "@/lib/constants";
import { usePropertyStore } from "@/stores/property-store";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tokenInput, setTokenInput] = useState("");

  const existing = localStorage.getItem(AUTH_STORAGE_KEY);
  if (existing !== null && existing !== "") {
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const value = tokenInput.trim() !== "" ? tokenInput.trim() : MVP_DEMO_TOKEN;
    localStorage.setItem(AUTH_STORAGE_KEY, value);
    usePropertyStore.getState().setSelectedPropertyId(null);
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    navigate(from, { replace: true });
  }

  function handleQuickMvp(): void {
    localStorage.setItem(AUTH_STORAGE_KEY, MVP_DEMO_TOKEN);
    usePropertyStore.getState().setSelectedPropertyId(null);
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    navigate(from, { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">OpenPMS</h1>
          <p className="text-sm text-muted-foreground">
            Вход (MVP): укажите Bearer-токен или используйте демо.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="token"
              className="text-sm font-medium text-foreground"
            >
              Токен
            </label>
            <Input
              id="token"
              name="token"
              type="password"
              autoComplete="off"
              placeholder="Вставьте токен API"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Войти
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleQuickMvp}
        >
          Войти с демо-токеном
        </Button>
      </div>
    </div>
  );
}
