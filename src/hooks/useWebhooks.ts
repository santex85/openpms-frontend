import { useQuery } from "@tanstack/react-query";

import {
  fetchWebhookDeliveryLogs,
  fetchWebhookSubscriptions,
} from "@/api/webhooks-admin";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useWebhookSubscriptions(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["webhooks", "subscriptions", authKey, selectedPropertyId],
    queryFn: () => fetchWebhookSubscriptions(selectedPropertyId),
    enabled,
  });
}

export function useWebhookDeliveryLogs(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["webhooks", "delivery-logs", authKey, selectedPropertyId],
    queryFn: () => fetchWebhookDeliveryLogs(selectedPropertyId),
    enabled,
  });
}
