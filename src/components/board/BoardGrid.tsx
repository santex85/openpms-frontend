import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type MeasuringConfiguration,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import type { ReactElement } from "react";

import { BoardTapeGrid } from "@/components/board/BoardTapeGrid";
import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { formatApiError } from "@/lib/formatApiError";
import { cn } from "@/lib/utils";
import type { Booking, RoomRow, RoomType } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";

export interface BoardGridProps {
  sensors: SensorDescriptor<SensorOptions>[];
  collisionDetection: CollisionDetection;
  measuring: MeasuringConfiguration;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  boardMessage: string | null;
  assignRoomError: boolean;
  assignRoomErrorObj: unknown;
  patchBookingError: boolean;
  patchBookingErrorObj: unknown;
  sortedRoomTypes: RoomType[];
  /** Unassigned bookings grouped by room type id for category overflow lanes. */
  unassignedByRoomTypeId: ReadonlyMap<string, Booking[]>;
  days: MonthDayMeta[];
  rooms: RoomRow[];
  bookingsForGrid: Booking[];
  sumsByDate: Map<string, number>;
  showAvailabilityPending: boolean;
  availabilityError: boolean;
  roomDuplicateKeys: ReadonlySet<string>;
  bookingMenuApi: BoardBookingMenuApi | null;
  onEmptyCellClick: (payload: { room: RoomRow; nightIso: string }) => void;
  dragOverlayBooking: Booking | null;
  renderDragOverlay: (booking: Booking) => ReactElement;
}

export function BoardGrid({
  sensors,
  collisionDetection,
  measuring,
  onDragStart,
  onDragEnd,
  onDragCancel,
  boardMessage,
  assignRoomError,
  assignRoomErrorObj,
  patchBookingError,
  patchBookingErrorObj,
  sortedRoomTypes,
  unassignedByRoomTypeId,
  days,
  rooms,
  bookingsForGrid,
  sumsByDate,
  showAvailabilityPending,
  availabilityError,
  roomDuplicateKeys,
  bookingMenuApi,
  onEmptyCellClick,
  dragOverlayBooking,
  renderDragOverlay,
}: BoardGridProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {(boardMessage !== null || assignRoomError || patchBookingError) && (
        <div
          className={cn(
            "mb-3 rounded-md border px-3 py-2 text-sm",
            assignRoomError || patchBookingError
              ? "border-destructive/60 bg-destructive/10 text-destructive"
              : "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          )}
          role="alert"
        >
          {assignRoomError
            ? formatApiError(assignRoomErrorObj)
            : patchBookingError
              ? formatApiError(patchBookingErrorObj)
              : boardMessage}
        </div>
      )}
      <div className="min-w-0 overflow-x-auto">
        <BoardTapeGrid
          days={days}
          roomTypes={sortedRoomTypes}
          rooms={rooms}
          bookings={bookingsForGrid}
          sumsByDate={sumsByDate}
          availabilityPending={showAvailabilityPending}
          availabilityError={availabilityError}
          duplicateRoomNameKeys={roomDuplicateKeys}
          bookingMenuApi={bookingMenuApi}
          onEmptyCellClick={onEmptyCellClick}
          unassignedByRoomTypeId={unassignedByRoomTypeId}
        />
      </div>
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {dragOverlayBooking !== null
          ? renderDragOverlay(dragOverlayBooking)
          : null}
      </DragOverlay>
    </DndContext>
  );
}
