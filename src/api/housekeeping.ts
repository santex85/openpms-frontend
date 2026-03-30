import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { HousekeepingListResponse } from "@/types/housekeeping";

export interface FetchHousekeepingParams {
  propertyId: string;
  /** Операционная дата YYYY-MM-DD. */
  date: string;
}

export async function fetchHousekeeping(
  params: FetchHousekeepingParams
): Promise<HousekeepingListResponse> {
  const { data } = await apiClient.get<HousekeepingListResponse>("/housekeeping", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      date: params.date,
    },
  });
  return data;
}
