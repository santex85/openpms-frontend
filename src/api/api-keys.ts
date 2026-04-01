import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  ApiKeyCreateRequest,
  ApiKeyCreateResponse,
  ApiKeyRead,
} from "@/types/tenant-admin";

export async function fetchApiKeys(
  propertyId: string | null
): Promise<ApiKeyRead[]> {
  const params =
    propertyId !== null && propertyId !== ""
      ? { [PROPERTY_ID_QUERY_PARAM]: propertyId }
      : {};
  const { data } = await apiClient.get<ApiKeyRead[]>("/api-keys", {
    params,
  });
  return data;
}

export async function createApiKey(
  propertyId: string | null,
  body: ApiKeyCreateRequest
): Promise<ApiKeyCreateResponse> {
  const params =
    propertyId !== null && propertyId !== ""
      ? { [PROPERTY_ID_QUERY_PARAM]: propertyId }
      : {};
  const { data } = await apiClient.post<ApiKeyCreateResponse>(
    "/api-keys",
    body,
    { params }
  );
  return data;
}

export async function deactivateApiKey(keyId: string): Promise<void> {
  await apiClient.patch(`/api-keys/${keyId}`, { is_active: false });
}

export async function deleteApiKey(keyId: string): Promise<void> {
  await apiClient.delete(`/api-keys/${keyId}`);
}
