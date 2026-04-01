import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { DashboardSummary } from "@/types/api";

export async function fetchDashboardSummary(
  propertyId: string
): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}
