import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCountryPackExtension,
  deleteCountryPackExtension,
  fetchCountryPackExtensions,
} from "@/api/country-pack-extensions";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { CountryPackExtensionCreate } from "@/types/country-pack";

export function useCountryPackExtensions(enabled: boolean) {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["country-pack-extensions", authKey],
    queryFn: fetchCountryPackExtensions,
    enabled,
  });
}

export function useCreateCountryPackExtension() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: CountryPackExtensionCreate) =>
      createCountryPackExtension(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["country-pack-extensions", authKey],
      });
    },
  });
}

export function useDeleteCountryPackExtension() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (id: string) => deleteCountryPackExtension(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["country-pack-extensions", authKey],
      });
    },
  });
}
