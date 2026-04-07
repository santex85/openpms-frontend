import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createWebhookSubscription,
  deleteWebhookSubscription,
  patchWebhookSubscription,
} from "@/api/webhooks-admin";
import {
  reencryptWebhookSecrets,
  type WebhookReencryptSecretsBody,
} from "@/api/webhooks-reencrypt";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type {
  WebhookSubscriptionCreateRequest,
  WebhookSubscriptionPatchRequest,
} from "@/types/tenant-admin";

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

export function usePatchWebhookSubscription() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: ({
      subscriptionId,
      body,
    }: {
      subscriptionId: string;
      body: WebhookSubscriptionPatchRequest;
    }) => patchWebhookSubscription(subscriptionId, body),
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

export function useReencryptWebhookSecrets() {
  return useMutation({
    mutationFn: (body: WebhookReencryptSecretsBody) =>
      reencryptWebhookSecrets(body),
  });
}
