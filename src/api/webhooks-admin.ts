import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { WebhookCreateRequest, WebhookRead } from "@/types/tenant-admin";

export async function fetchWebhooks(propertyId: string): Promise<WebhookRead[]> {
  const { data } = await apiClient.get<WebhookRead[]>("/webhooks", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function createWebhook(
  propertyId: string,
  body: WebhookCreateRequest
): Promise<WebhookRead> {
  const { data } = await apiClient.post<WebhookRead>("/webhooks", body, {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await apiClient.delete(`/webhooks/${webhookId}`);
}
