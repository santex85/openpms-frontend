import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AUTH_STORAGE_KEY } from "@/lib/constants";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const token = localStorage.getItem(AUTH_STORAGE_KEY);

  if (token === null || token === "") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
