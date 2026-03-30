import { useQuery } from "@tanstack/react-query";

import { fetchApiKeys } from "@/api/api-keys";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useApiKeys(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["api-keys", authKey, selectedPropertyId],
    queryFn: () => fetchApiKeys(selectedPropertyId),
    enabled: enabled,
  });
}
