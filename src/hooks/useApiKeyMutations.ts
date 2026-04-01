import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createApiKey,
  deactivateApiKey,
  deleteApiKey,
} from "@/api/api-keys";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { ApiKeyCreateRequest } from "@/types/tenant-admin";

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: (body: ApiKeyCreateRequest) =>
      createApiKey(selectedPropertyId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["api-keys", authKey, selectedPropertyId],
      });
    },
  });
}

export function useDeactivateApiKey() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: (keyId: string) => deactivateApiKey(keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["api-keys", authKey, selectedPropertyId],
      });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useMutation({
    mutationFn: (keyId: string) => deleteApiKey(keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["api-keys", authKey, selectedPropertyId],
      });
    },
  });
}
