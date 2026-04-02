import axios from "axios";

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

/** One HTTP call when backend supports `GET /rates/batch`; otherwise parallel `GET /rates` per category. */
export async function fetchRatesForRoomTypesBatch(params: {
  roomTypeIds: string[];
  ratePlanId: string;
  startDate: string;
  endDate: string;
}): Promise<Map<string, RateRead[]>> {
  if (params.roomTypeIds.length === 0) {
    return new Map();
  }

  const emptyById = (): Map<string, RateRead[]> => {
    const m = new Map<string, RateRead[]>();
    for (const id of params.roomTypeIds) {
      m.set(id, []);
    }
    return m;
  };

  const partition = (rows: RateRead[]): Map<string, RateRead[]> => {
    const map = emptyById();
    for (const row of rows) {
      const list = map.get(row.room_type_id);
      if (list !== undefined) {
        list.push(row);
      }
    }
    return map;
  };

  try {
    const { data } = await apiClient.get<RateRead[]>("/rates/batch", {
      params: {
        rate_plan_id: params.ratePlanId,
        start_date: params.startDate,
        end_date: params.endDate,
        room_type_ids: params.roomTypeIds.join(","),
      },
    });
    return partition(data);
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      (err.response?.status === 404 || err.response?.status === 405)
    ) {
      const rows = await Promise.all(
        params.roomTypeIds.map((roomTypeId) =>
          fetchRatesForPeriod({
            roomTypeId,
            ratePlanId: params.ratePlanId,
            startDate: params.startDate,
            endDate: params.endDate,
          })
        )
      );
      const map = emptyById();
      params.roomTypeIds.forEach((id, i) => {
        map.set(id, rows[i] ?? []);
      });
      return map;
    }
    throw err;
  }
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
