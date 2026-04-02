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

/** Плоский элемент ответа GET /housekeeping (схема бэка). */
interface HousekeepingRoomRead {
  id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  room_type_name: string;
  name: string;
  status: string;
  housekeeping_status: string;
  housekeeping_priority: string;
  guest_name?: string | null;
  current_guest_name?: string | null;
}

export async function fetchHousekeeping(
  params: FetchHousekeepingParams
): Promise<HousekeepingListResponse> {
  const { data } = await apiClient.get<HousekeepingRoomRead[]>("/housekeeping", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      status: params.status,
      ...(params.date !== undefined && params.date !== ""
        ? { date: params.date }
        : {}),
    },
  });
  return {
    items: data.map((r) => ({
      id: r.id,
      room_id: r.id,
      label: r.name,
      status: normalizeHousekeepingStatus(r.housekeeping_status),
      notes: null,
      room_type_name: r.room_type_name,
      guest_name: r.guest_name ?? r.current_guest_name ?? null,
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
  await apiClient.patch(`/housekeeping/${roomId}`, {
    housekeeping_status: body.status,
  });
}
