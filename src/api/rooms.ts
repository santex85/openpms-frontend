import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RoomCreate, RoomPatch, RoomRow } from "@/types/rooms";

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

export async function patchRoom(
  roomId: string,
  body: RoomPatch
): Promise<RoomRow> {
  const { data } = await apiClient.patch<RoomRow>(`/rooms/${roomId}`, body);
  return data;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiClient.delete(`/rooms/${roomId}`);
}

