import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  RatePlanCreate,
  RatePlanPatch,
  RatePlanRead,
} from "@/types/rate-plans";

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

export async function deleteRatePlan(ratePlanId: string): Promise<void> {
  await apiClient.delete(`/rate-plans/${ratePlanId}`);
}

export async function patchRatePlan(
  ratePlanId: string,
  body: RatePlanPatch
): Promise<RatePlanRead> {
  const { data } = await apiClient.patch<RatePlanRead>(
    `/rate-plans/${ratePlanId}`,
    body
  );
  return data;
}

