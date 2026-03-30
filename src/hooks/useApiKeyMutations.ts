import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createApiKey, revokeApiKey } from "@/api/api-keys";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { ApiKeyCreateRequest, ApiKeyCreateResponse } from "@/types/tenant-admin";

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { propertyId: string; body: ApiKeyCreateRequest }) =>
      createApiKey(args.propertyId, args.body),
    onSuccess: (_data: ApiKeyCreateResponse, args) => {
      void queryClient.invalidateQueries({
        queryKey: ["api-keys", authKey, args.propertyId],
      });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { keyId: string; propertyId: string }) =>
      revokeApiKey(args.keyId),
    onSuccess: (_void, args) => {
      void queryClient.invalidateQueries({
        queryKey: ["api-keys", authKey, args.propertyId],
      });
    },
  });
}
