import { apiClient } from "@/lib/api";
import type { AuthInviteRequest, TenantUserRead } from "@/types/tenant-admin";

export async function fetchTenantUsers(): Promise<TenantUserRead[]> {
  const { data } = await apiClient.get<TenantUserRead[]>("/users");
  return data;
}

export async function inviteTenantUser(body: AuthInviteRequest): Promise<void> {
  await apiClient.post("/auth/invite", body);
}
