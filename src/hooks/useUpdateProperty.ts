import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProperty } from "@/api/properties";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { PropertyCreate } from "@/types/api";

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { propertyId: string; body: PropertyCreate }) =>
      updateProperty(args.propertyId, args.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["properties", authKey] });
    },
  });
}
