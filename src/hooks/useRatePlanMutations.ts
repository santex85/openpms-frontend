import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createRatePlan, deleteRatePlan, patchRatePlan } from "@/api/rate-plans";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RatePlanCreate, RatePlanPatch } from "@/types/rate-plans";

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

export function usePatchRatePlan() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: ({
      ratePlanId,
      body,
    }: {
      ratePlanId: string;
      body: RatePlanPatch;
    }) => patchRatePlan(ratePlanId, body),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["rate-plans", authKey, propertyId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["rates", "nightly", authKey],
      });
      toast.success("Тарифный план обновлён.");
    },
    onError: () => {
      toast.error("Не удалось сохранить тарифный план.");
    },
  });
}

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
