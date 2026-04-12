import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deletePaymentMethod,
  fetchPaymentMethods,
  savePaymentMethod,
} from "@/api/stripe";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { SavePaymentMethodRequest } from "@/types/stripe";

export function usePaymentMethods(
  propertyId: string | undefined,
  bookingId: string | null | undefined,
  enabled: boolean
) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["stripe", "payment-methods", authKey, propertyId, bookingId ?? ""],
    queryFn: () =>
      fetchPaymentMethods(propertyId!, bookingId ?? undefined),
    enabled: Boolean(propertyId) && enabled,
  });
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      body,
    }: {
      propertyId: string;
      body: SavePaymentMethodRequest;
    }) => savePaymentMethod(propertyId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stripe"] });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pmRowId: string) => deletePaymentMethod(pmRowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stripe"] });
    },
  });
}
