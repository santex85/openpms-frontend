import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  ApiKeyCreateRequest,
  ApiKeyCreateResponse,
  ApiKeyRead,
} from "@/types/tenant-admin";

export async function fetchApiKeys(propertyId: string): Promise<ApiKeyRead[]> {
  const { data } = await apiClient.get<ApiKeyRead[]>("/api-keys", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function createApiKey(
  propertyId: string,
  body: ApiKeyCreateRequest
): Promise<ApiKeyCreateResponse> {
  const { data } = await apiClient.post<ApiKeyCreateResponse>("/api-keys", body, {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await apiClient.delete(`/api-keys/${keyId}`);
}
