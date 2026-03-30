import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import {
  normalizeHousekeepingStatus,
  type HousekeepingListResponse,
  type HousekeepingStatus,
} from "@/types/housekeeping";

export interface FetchHousekeepingParams {
  propertyId: string;
  status: HousekeepingStatus;
  /** Опционально для бэков с операционной датой. */
  date?: string;
}

export async function fetchHousekeeping(
  params: FetchHousekeepingParams
): Promise<HousekeepingListResponse> {
  const { data } = await apiClient.get<HousekeepingListResponse>("/housekeeping", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      status: params.status,
      ...(params.date !== undefined && params.date !== ""
        ? { date: params.date }
        : {}),
    },
  });
  return {
    ...data,
    items: (data.items ?? []).map((item) => ({
      ...item,
      status: normalizeHousekeepingStatus(String(item.status)),
    })),
  };
}

export interface PatchHousekeepingRoomBody {
  status: HousekeepingStatus;
}

export async function patchHousekeepingRoom(
  roomId: string,
  body: PatchHousekeepingRoomBody
): Promise<void> {
  await apiClient.patch(`/housekeeping/${roomId}`, body);
}
