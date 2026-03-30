import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  WebhookDeliveryLogRead,
  WebhookSubscriptionCreateRequest,
  WebhookSubscriptionCreateResponse,
  WebhookSubscriptionRead,
} from "@/types/tenant-admin";

function propertyParams(propertyId: string | null): Record<string, string> {
  if (propertyId === null || propertyId === "") {
    return {};
  }
  return { [PROPERTY_ID_QUERY_PARAM]: propertyId };
}

export async function fetchWebhookSubscriptions(
  propertyId: string | null
): Promise<WebhookSubscriptionRead[]> {
  const { data } = await apiClient.get<WebhookSubscriptionRead[]>(
    "/webhooks/subscriptions",
    { params: propertyParams(propertyId) }
  );
  return data;
}

export async function createWebhookSubscription(
  propertyId: string | null,
  body: WebhookSubscriptionCreateRequest
): Promise<WebhookSubscriptionCreateResponse> {
  const { data } = await apiClient.post<WebhookSubscriptionCreateResponse>(
    "/webhooks/subscriptions",
    body,
    { params: propertyParams(propertyId) }
  );
  return data;
}

export async function deleteWebhookSubscription(
  subscriptionId: string
): Promise<void> {
  await apiClient.delete(`/webhooks/subscriptions/${subscriptionId}`);
}

export async function fetchWebhookDeliveryLogs(
  propertyId: string | null
): Promise<WebhookDeliveryLogRead[]> {
  const { data } = await apiClient.get<WebhookDeliveryLogRead[]>(
    "/webhooks/delivery-logs",
    { params: propertyParams(propertyId) }
  );
  return data;
}
