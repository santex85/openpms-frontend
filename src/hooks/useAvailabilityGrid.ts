import { useQuery } from "@tanstack/react-query";

import { fetchAvailabilityGrid } from "@/api/inventory";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useAvailabilityGrid(startDate: string, endDate: string) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: [
      "inventory",
      "availability",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
    ],
    queryFn: () =>
      fetchAvailabilityGrid({
        propertyId: selectedPropertyId!,
        startDate,
        endDate,
      }),
    enabled: Boolean(selectedPropertyId),
  });
}
