import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyCountryPack,
  fetchCountryPackByCode,
  fetchCountryPacks,
} from "@/api/country-packs";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useCountryPacksList() {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["country-packs", authKey],
    queryFn: fetchCountryPacks,
    staleTime: 5 * 60_000,
  });
}

export function useCountryPackDetail(code: string | null | undefined) {
  const authKey = authQueryKeyPart();
  const safe = code?.trim() ?? "";

  return useQuery({
    queryKey: ["country-pack", authKey, safe],
    queryFn: () => fetchCountryPackByCode(safe),
    enabled: safe !== "",
    staleTime: 5 * 60_000,
  });
}

export function useApplyCountryPack() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const setCountryPackCode = usePropertyStore((s) => s.setCountryPackCode);

  return useMutation({
    mutationFn: (code: string) => applyCountryPack(code),
    onSuccess: (property) => {
      setCountryPackCode(property.country_pack_code ?? null);
      void queryClient.invalidateQueries({ queryKey: ["properties", authKey] });
      void queryClient.invalidateQueries({ queryKey: ["country-packs", authKey] });
      void queryClient.invalidateQueries({
        queryKey: ["country-pack", authKey],
        exact: false,
      });
    },
  });
}
