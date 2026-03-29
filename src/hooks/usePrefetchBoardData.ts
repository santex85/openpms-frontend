import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchBookings } from "@/api/bookings";
import { fetchAvailabilityGrid } from "@/api/inventory";
import { fetchRoomTypes } from "@/api/room-types";
import { fetchRooms } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import { getMonthRange } from "@/utils/boardDates";

/**
 * When a property is selected anywhere under AppLayout, warm the cache for
 * /board (room types + availability) so Network shows those requests and
 * navigation to the room grid is instant.
 */
export function usePrefetchBoardData() {
  const queryClient = useQueryClient();
  const propertyId = usePropertyStore((s) => s.selectedPropertyId);

  useEffect(() => {
    if (propertyId === null) return;

    const { startIso, endIso } = getMonthRange(new Date());
    const authKey = authQueryKeyPart();

    void queryClient.prefetchQuery({
      queryKey: ["room-types", authKey, propertyId],
      queryFn: () => fetchRoomTypes(propertyId),
    });

    void queryClient.prefetchQuery({
      queryKey: [
        "inventory",
        "availability",
        authKey,
        propertyId,
        startIso,
        endIso,
      ],
      queryFn: () =>
        fetchAvailabilityGrid({
          propertyId,
          startDate: startIso,
          endDate: endIso,
        }),
    });

    void queryClient.prefetchQuery({
      queryKey: ["rooms", authKey, propertyId],
      queryFn: () => fetchRooms(propertyId),
    });

    void queryClient.prefetchQuery({
      queryKey: ["bookings", authKey, propertyId, startIso, endIso],
      queryFn: () =>
        fetchBookings({
          propertyId,
          startDate: startIso,
          endDate: endIso,
        }),
    });
  }, [propertyId, queryClient]);
}
