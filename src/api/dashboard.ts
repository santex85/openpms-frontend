import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { DashboardSummary } from "@/types/dashboard";

export interface FetchDashboardSummaryParams {
  propertyId: string;
  startDate: string;
  endDate: string;
}

export async function fetchDashboardSummary(
  params: FetchDashboardSummaryParams
): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });
  return data;
}
