import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RatePlanCreate, RatePlanRead } from "@/types/rates";

export async function fetchRatePlans(propertyId: string): Promise<RatePlanRead[]> {
  const { data } = await apiClient.get<RatePlanRead[]>("/rate-plans", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function createRatePlan(
  body: RatePlanCreate
): Promise<RatePlanRead> {
  const { data } = await apiClient.post<RatePlanRead>("/rate-plans", body);
  return data;
}
