import { useQuery } from "@tanstack/react-query";

import { fetchDashboardSummary } from "@/api/dashboard";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useDashboardSummary() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["dashboard", "summary", authKey, selectedPropertyId],
    queryFn: () => fetchDashboardSummary(selectedPropertyId!),
    enabled: selectedPropertyId !== null,
  });
}
