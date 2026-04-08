import { useMemo } from "react";

import { useProperties } from "@/hooks/useProperties";
import { usePropertyHasAnyBooking } from "@/hooks/usePropertyHasAnyBooking";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import { usePropertyStore } from "@/stores/property-store";

/** Property, country pack on property, room types, rooms, rate plans, first booking. */
export function useOnboardingProgress() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: properties } = useProperties();
  const { data: roomTypes } = useRoomTypes();
  const { data: rooms } = useRooms();
  const { data: ratePlans } = useRatePlans();
  const hasBooking = usePropertyHasAnyBooking();

  const hasProperty = (properties?.length ?? 0) > 0;
  const hasCountryPack = useMemo(() => {
    if (!properties?.length) {
      return false;
    }
    const prop =
      selectedPropertyId !== null
        ? properties.find((p) => p.id === selectedPropertyId)
        : properties[0];
    const code = prop?.country_pack_code;
    return typeof code === "string" && code.trim() !== "";
  }, [properties, selectedPropertyId]);
  const hasRoomTypes = (roomTypes?.length ?? 0) > 0;
  const hasRooms = (rooms?.length ?? 0) > 0;
  const hasRates = (ratePlans?.length ?? 0) > 0;

  const stepDone = useMemo(
    () => [
      hasProperty,
      hasCountryPack,
      hasRoomTypes,
      hasRooms,
      hasRates,
      hasBooking,
    ],
    [
      hasProperty,
      hasCountryPack,
      hasRoomTypes,
      hasRooms,
      hasRates,
      hasBooking,
    ]
  );

  const allDone = stepDone.every(Boolean);

  return { stepDone, allDone };
}
