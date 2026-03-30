import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createWebhook, deleteWebhook } from "@/api/webhooks-admin";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { WebhookCreateRequest } from "@/types/tenant-admin";

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { propertyId: string; body: WebhookCreateRequest }) =>
      createWebhook(args.propertyId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", authKey, args.propertyId],
      });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { webhookId: string; propertyId: string }) =>
      deleteWebhook(args.webhookId),
    onSuccess: (_void, args) => {
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", authKey, args.propertyId],
      });
    },
  });
}
