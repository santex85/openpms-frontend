import { apiClient } from "@/lib/api";
import type {
  AuthInviteRequest,
  AuthInviteResponse,
  TenantUserPatchRequest,
  TenantUserRead,
} from "@/types/tenant-admin";

export async function fetchTenantUsers(): Promise<TenantUserRead[]> {
  const { data } = await apiClient.get<TenantUserRead[]>("/auth/users");
  return data;
}

export async function inviteTenantUser(
  body: AuthInviteRequest
): Promise<AuthInviteResponse> {
  const { data } = await apiClient.post<AuthInviteResponse>(
    "/auth/invite",
    body
  );
  return data;
}

export async function patchTenantUser(
  userId: string,
  body: TenantUserPatchRequest
): Promise<TenantUserRead> {
  const { data } = await apiClient.patch<TenantUserRead>(
    `/auth/users/${userId}`,
    body
  );
  return data;
}

