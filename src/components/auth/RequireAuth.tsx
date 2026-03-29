import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { refreshAccessToken } from "@/api/auth";
import { getAccessToken, getTenantIdForRefresh } from "@/lib/authSession";

interface RequireAuthProps {
  children: ReactNode;
}

type GateState = "loading" | "authed" | "anon";

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const [gate, setGate] = useState<GateState>(() =>
    getAccessToken() !== null && getAccessToken() !== "" ? "authed" : "loading"
  );

  useEffect(() => {
    let cancelled = false;
    if (getAccessToken() !== null && getAccessToken() !== "") {
      setGate("authed");
      return;
    }
    const tid = getTenantIdForRefresh();
    if (tid === null || tid === "") {
      setGate("anon");
      return;
    }
    (async () => {
      try {
        await refreshAccessToken();
        if (!cancelled) {
          setGate("authed");
        }
      } catch {
        if (!cancelled) {
          setGate("anon");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Загрузка сессии…</p>
      </div>
    );
  }

  if (gate === "anon") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
