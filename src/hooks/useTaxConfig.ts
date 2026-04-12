import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTaxConfig, putTaxConfig } from "@/api/tax-config";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { TaxConfigPut, TaxConfigRead } from "@/types/tax-config";

export function taxConfigQueryKey(
  propertyId: string | null,
  authKey: string
): (string | null)[] {
  return ["tax-config", propertyId, authKey];
}

export function useTaxConfig(propertyId: string | null) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: taxConfigQueryKey(propertyId, authKey),
    queryFn: () => fetchTaxConfig(propertyId!),
    enabled: propertyId !== null && propertyId !== "",
  });
}

export function usePutTaxConfig() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { propertyId: string; body: TaxConfigPut }) =>
      putTaxConfig(args.propertyId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({
        queryKey: taxConfigQueryKey(args.propertyId, authKey),
      });
    },
  });
}

export type { TaxConfigRead, TaxConfigPut };
