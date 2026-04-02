import { useMemo } from "react";

import { useProperties } from "@/hooks/useProperties";
import { usePropertyHasAnyBooking } from "@/hooks/usePropertyHasAnyBooking";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";

/** Property, room types, rooms, rate plans, and at least one booking (see usePropertyHasAnyBooking). */
export function useOnboardingProgress() {
  const { data: properties } = useProperties();
  const { data: roomTypes } = useRoomTypes();
  const { data: rooms } = useRooms();
  const { data: ratePlans } = useRatePlans();
  const hasBooking = usePropertyHasAnyBooking();

  const hasProperty = (properties?.length ?? 0) > 0;
  const hasRoomTypes = (roomTypes?.length ?? 0) > 0;
  const hasRooms = (rooms?.length ?? 0) > 0;
  const hasRates = (ratePlans?.length ?? 0) > 0;

  const stepDone = useMemo(
    () => [
      hasProperty,
      hasRoomTypes,
      hasRooms,
      hasRates,
      hasBooking,
    ],
    [hasProperty, hasRoomTypes, hasRooms, hasRates, hasBooking]
  );

  const allDone = stepDone.every(Boolean);

  return { stepDone, allDone };
}
