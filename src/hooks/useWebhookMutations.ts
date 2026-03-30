import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createWebhookSubscription,
  deleteWebhookSubscription,
} from "@/api/webhooks-admin";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { WebhookSubscriptionCreateRequest } from "@/types/tenant-admin";

export function useCreateWebhookSubscription() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: (body: WebhookSubscriptionCreateRequest) =>
      createWebhookSubscription(selectedPropertyId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", "subscriptions", authKey, selectedPropertyId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", "delivery-logs", authKey, selectedPropertyId],
      });
    },
  });
}

export function useDeleteWebhookSubscription() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: (subscriptionId: string) =>
      deleteWebhookSubscription(subscriptionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", authKey, selectedPropertyId],
        exact: false,
      });
    },
  });
}
