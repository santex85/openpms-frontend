import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RoomRow } from "@/types/api";

export async function fetchRooms(propertyId: string): Promise<RoomRow[]> {
  const { data } = await apiClient.get<RoomRow[]>("/rooms", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}
