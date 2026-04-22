import type { UserRead } from "@/types/api";
import { apiClient } from "@/lib/api";
import { authHttp } from "@/lib/authHttp";
import {
  clearSession,
  getTenantIdForRefresh,
  replaceAccessToken,
  setSession,
} from "@/lib/authSession";
import { queryClient } from "@/lib/queryClient";

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
  queryClient.clear();
  return data;
}

export async function loginRequest(
  email: string,
  password: string,
  tenantId?: string
): Promise<AuthLoginPublicResponse> {
  const body: {
    email: string;
    password: string;
    tenant_id?: string;
  } = {
    email: email.trim(),
    password,
  };
  const tid = tenantId?.trim();
  if (tid !== undefined && tid !== "") {
    body.tenant_id = tid;
  }
  const { data } = await authHttp.post<AuthLoginPublicResponse>(
    "/auth/login",
    body
  );
  setSession(data.access_token, String(data.user.tenant_id));
  queryClient.clear();
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
  replaceAccessToken(data.access_token);
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
  queryClient.clear();
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

export async function patchMeProfile(body: {
  full_name: string;
  email: string;
}): Promise<UserRead> {
  const { data } = await apiClient.patch<UserRead>("/auth/me", {
    full_name: body.full_name.trim(),
    email: body.email.trim(),
  });
  return data;
}

export async function postForgotPassword(email: string): Promise<void> {
  await authHttp.post("/auth/forgot-password", { email: email.trim() });
}

export async function postResetPassword(body: {
  token: string;
  password: string;
}): Promise<void> {
  await authHttp.post("/auth/reset-password", {
    token: body.token.trim(),
    password: body.password,
  });
}
