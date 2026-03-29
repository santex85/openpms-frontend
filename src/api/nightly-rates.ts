import { apiClient } from "@/lib/api";
import type {
  BulkRatesPutRequest,
  BulkRatesPutResponse,
  RateRead,
} from "@/types/rates";

export async function fetchRatesForPeriod(params: {
  roomTypeId: string;
  ratePlanId: string;
  startDate: string;
  endDate: string;
}): Promise<RateRead[]> {
  const { data } = await apiClient.get<RateRead[]>("/rates", {
    params: {
      room_type_id: params.roomTypeId,
      rate_plan_id: params.ratePlanId,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });
  return data;
}

export async function bulkUpsertRates(
  body: BulkRatesPutRequest
): Promise<BulkRatesPutResponse> {
  const { data } = await apiClient.put<BulkRatesPutResponse>(
    "/rates/bulk",
    body
  );
  return data;
}
