import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RoomType } from "@/types/api";

export async function fetchRoomTypes(propertyId: string): Promise<RoomType[]> {
  const { data } = await apiClient.get<RoomType[]>("/room-types", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}
