import type { UserRead } from "@/types/api";
import { apiClient } from "@/lib/api";
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

export interface AuthRegisterRequest {
  tenant_name: string;
  email: string;
  password: string;
  full_name: string;
}

export async function registerRequest(
  body: AuthRegisterRequest
): Promise<AuthLoginPublicResponse> {
  const { data } = await authHttp.post<AuthLoginPublicResponse>(
    "/auth/register",
    {
      tenant_name: body.tenant_name.trim(),
      email: body.email.trim(),
      password: body.password,
      full_name: body.full_name.trim(),
    }
  );
  setSession(data.access_token, String(data.user.tenant_id));
  return data;
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

export async function fetchMe(): Promise<UserRead> {
  const { data } = await apiClient.get<UserRead>("/auth/me");
  return data;
}

export interface AuthChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export async function changePassword(
  body: AuthChangePasswordRequest
): Promise<void> {
  await apiClient.post("/auth/change-password", {
    current_password: body.current_password,
    new_password: body.new_password,
  });
}
