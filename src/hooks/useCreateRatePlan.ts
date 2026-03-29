import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRatePlan } from "@/api/rate-plans";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RatePlanCreate } from "@/types/rates";

export function useCreateRatePlan() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: RatePlanCreate) => createRatePlan(body),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["rate-plans", authKey, propertyId],
      });
    },
  });
}
