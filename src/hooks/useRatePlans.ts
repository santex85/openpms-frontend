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

/** Rate plans for a specific property (e.g. booking card when hotel may differ from UI selection). */
export function useRatePlansForProperty(propertyId: string | null | undefined) {
  const authKey = authQueryKeyPart();
  const id = propertyId ?? null;

  return useQuery({
    queryKey: ["rate-plans", authKey, id],
    queryFn: () => fetchRatePlans(id!),
    enabled: Boolean(id),
  });
}
