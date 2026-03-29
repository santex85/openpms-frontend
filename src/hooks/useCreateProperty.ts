import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createProperty } from "@/api/properties";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { PropertyCreate } from "@/types/api";

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: PropertyCreate) => createProperty(body),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["properties", authKey] });
      usePropertyStore.getState().setSelectedPropertyId(data.id);
    },
  });
}
