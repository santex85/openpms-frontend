import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { disconnectStripe, fetchStripeStatus } from "@/api/stripe";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useStripeStatus(
  propertyId: string | undefined,
  enabled: boolean
) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["stripe", "status", authKey, propertyId],
    queryFn: () => fetchStripeStatus(propertyId!),
    enabled: Boolean(propertyId) && enabled,
  });
}

export function useDisconnectStripe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => disconnectStripe(propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stripe"] });
    },
  });
}
