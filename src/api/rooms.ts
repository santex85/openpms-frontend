import { isAxiosError } from "axios";

import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { RoomCreate, RoomPatch, RoomRow } from "@/types/rooms";

export async function fetchRooms(propertyId: string): Promise<RoomRow[]> {
  const { data } = await apiClient.get<RoomRow[]>("/rooms", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export interface FetchAssignableRoomsParams {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
}

/** Order: /rooms (always present on board builds), then dedicated assignable URLs. */
const ASSIGNABLE_ATTEMPTS: readonly {
  path: string;
  buildParams: (
    p: FetchAssignableRoomsParams
  ) => Record<string, string>;
}[] = [
  {
    path: "/rooms",
    buildParams: (p) => ({
      [PROPERTY_ID_QUERY_PARAM]: p.propertyId,
      for_stay_room_type_id: p.roomTypeId,
      for_stay_check_in: p.checkIn,
      for_stay_check_out: p.checkOut,
    }),
  },
  {
    path: "/bookings/assignable-rooms-for-stay",
    buildParams: (p) => ({
      [PROPERTY_ID_QUERY_PARAM]: p.propertyId,
      room_type_id: p.roomTypeId,
      check_in: p.checkIn,
      check_out: p.checkOut,
    }),
  },
  {
    path: "/inventory/rooms-for-stay",
    buildParams: (p) => ({
      [PROPERTY_ID_QUERY_PARAM]: p.propertyId,
      room_type_id: p.roomTypeId,
      check_in: p.checkIn,
      check_out: p.checkOut,
    }),
  },
  {
    path: "/assignable-rooms-for-stay",
    buildParams: (p) => ({
      [PROPERTY_ID_QUERY_PARAM]: p.propertyId,
      room_type_id: p.roomTypeId,
      check_in: p.checkIn,
      check_out: p.checkOut,
    }),
  },
];

function shouldTryAlternateAssignablePath(
  status: number | null,
  detail: unknown
): boolean {
  if (status === 404) {
    return true;
  }
  if (status !== 422 || !Array.isArray(detail)) {
    return false;
  }
  return detail.some((row: unknown) => {
    if (typeof row !== "object" || row === null) {
      return false;
    }
    const o = row as {
      type?: string;
      loc?: unknown;
      input?: unknown;
    };
    if (o.type !== "uuid_parsing") {
      return false;
    }
    if (!Array.isArray(o.loc)) {
      return false;
    }
    return (
      o.loc.includes("path") &&
      (o.loc.includes("room_id") || o.loc.includes("booking_id"))
    );
  });
}

/** Physical rooms free on stay nights (check_out exclusive). */
export async function fetchAssignableRooms(
  params: FetchAssignableRoomsParams
): Promise<RoomRow[]> {
  let lastErr: unknown;

  for (let i = 0; i < ASSIGNABLE_ATTEMPTS.length; i++) {
    const attempt = ASSIGNABLE_ATTEMPTS[i];
    const path = attempt.path;
    try {
      const { data } = await apiClient.get<RoomRow[]>(path, {
        params: attempt.buildParams(params),
      });
      return data;
    } catch (err) {
      lastErr = err;
      const ax = isAxiosError(err) ? err : null;
      const status = ax?.response?.status ?? null;
      const respData = ax?.response?.data as { detail?: unknown } | undefined;
      const detail = respData?.detail ?? null;
      const canTryNext =
        i < ASSIGNABLE_ATTEMPTS.length - 1 &&
        shouldTryAlternateAssignablePath(status, detail);
      if (canTryNext) {
        continue;
      }
      break;
    }
  }

  throw lastErr;
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

