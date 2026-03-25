import type { Booking } from "@/types/api";

/**
 * Board DnD id/data contract.
 *
 * - Draggable bookings and droppable rooms both use string ids that embed raw UUIDs.
 *   Without namespaces, a booking uuid could equal a room uuid and collide inside one
 *   `DndContext`, so we prefix: `booking:${id}` vs `room:${id}` (and `room:${id}:label`).
 * - Drag sources attach `BoardBookingDragData` on `useDraggable` `data` so `onDragEnd`
 *   can read a typed payload (assigned tile vs unassigned pool share the same handlers).
 */
export const DND_BOOKING_PREFIX = "booking:" as const;
export const DND_ROOM_PREFIX = "room:" as const;

export type BoardBookingDragData =
  | { type: "assigned_booking"; booking: Booking }
  | { type: "unassigned_booking"; booking: Booking };

export function isBoardBookingDragData(
  value: unknown
): value is BoardBookingDragData {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const v = value as Partial<BoardBookingDragData>;
  if (v.type !== "assigned_booking" && v.type !== "unassigned_booking") {
    return false;
  }
  const b = v.booking;
  return (
    typeof b === "object" &&
    b !== null &&
    "id" in b &&
    typeof (b as { id: unknown }).id === "string"
  );
}

export function bookingFromBoardDragData(
  value: unknown
): Booking | undefined {
  return isBoardBookingDragData(value) ? value.booking : undefined;
}

export function dndBookingId(bookingId: string): string {
  return `${DND_BOOKING_PREFIX}${bookingId}`;
}

export function dndRoomId(roomId: string): string {
  return `${DND_ROOM_PREFIX}${roomId}`;
}

/** Droppable on sticky room name (left column); parse in handleDragEnd like timeline zone. */
export function dndRoomLabelId(roomId: string): string {
  return `${DND_ROOM_PREFIX}${roomId}:label`;
}

export function parseRoomIdFromDndOver(overId: string): string | null {
  if (!overId.startsWith(DND_ROOM_PREFIX)) {
    return null;
  }
  const rest = overId.slice(DND_ROOM_PREFIX.length);
  return rest.replace(/:label$/, "");
}
