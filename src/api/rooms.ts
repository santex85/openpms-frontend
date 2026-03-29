import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RoomCreate, RoomRow } from "@/types/api";

export async function fetchRooms(propertyId: string): Promise<RoomRow[]> {
  const { data } = await apiClient.get<RoomRow[]>("/rooms", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function createRoom(body: RoomCreate): Promise<RoomRow> {
  const { data } = await apiClient.post<RoomRow>("/rooms", body);
  return data;
}
