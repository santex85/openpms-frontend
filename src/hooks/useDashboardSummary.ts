import { useQuery } from "@tanstack/react-query";

import { fetchDashboardSummary } from "@/api/dashboard";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useDashboardSummary(startDate: string, endDate: string) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: [
      "dashboard",
      "summary",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
    ],
    queryFn: () =>
      fetchDashboardSummary({
        propertyId: selectedPropertyId!,
        startDate,
        endDate,
      }),
    enabled:
      Boolean(selectedPropertyId) && startDate !== "" && endDate !== "",
  });
}
