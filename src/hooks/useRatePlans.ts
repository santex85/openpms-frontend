import { useQuery } from "@tanstack/react-query";

import { fetchRatePlans } from "@/api/rate-plans";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useRatePlans() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["rate-plans", authKey, selectedPropertyId],
    queryFn: () => fetchRatePlans(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId),
  });
}
