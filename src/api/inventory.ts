import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { AvailabilityGridResponse } from "@/types/inventory";

export interface FetchAvailabilityGridParams {
  propertyId: string;
  startDate: string;
  endDate: string;
}

export async function fetchAvailabilityGrid(
  params: FetchAvailabilityGridParams
): Promise<AvailabilityGridResponse> {
  const { data } = await apiClient.get<AvailabilityGridResponse>(
    "/inventory/availability",
    {
      params: {
        [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    }
  );
  return data;
}
