import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteRatePlan } from "@/api/rate-plans";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useDeleteRatePlan() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (ratePlanId: string) => deleteRatePlan(ratePlanId),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["rate-plans", authKey, propertyId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["rates", "nightly", authKey],
      });
    },
  });
}
