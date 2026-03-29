import type { UserRead } from "@/types/api";
import { authHttp } from "@/lib/authHttp";
import {
  clearSession,
  getTenantIdForRefresh,
  setSession,
} from "@/lib/authSession";

export interface AuthLoginPublicResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export async function loginRequest(
  tenantId: string,
  email: string,
  password: string
): Promise<AuthLoginPublicResponse> {
  const { data } = await authHttp.post<AuthLoginPublicResponse>("/auth/login", {
    tenant_id: tenantId,
    email: email.trim(),
    password,
  });
  setSession(data.access_token, String(data.user.tenant_id));
  return data;
}

export async function refreshAccessToken(): Promise<void> {
  const tid = getTenantIdForRefresh();
  if (tid === null || tid === "") {
    throw new Error("missing tenant for refresh");
  }
  const { data } = await authHttp.post<AccessTokenResponse>("/auth/refresh", {
    tenant_id: tid,
  });
  setSession(data.access_token, tid);
}

let refreshMutex: Promise<void> | null = null;

export function refreshAccessTokenSingleFlight(): Promise<void> {
  if (refreshMutex === null) {
    refreshMutex = refreshAccessToken().finally(() => {
      refreshMutex = null;
    });
  }
  return refreshMutex;
}

export function logoutSession(): void {
  clearSession();
}
