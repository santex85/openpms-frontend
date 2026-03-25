import { useQuery } from "@tanstack/react-query";

import { fetchBookings } from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useBookings(startDate: string, endDate: string) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: [
      "bookings",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
    ],
    queryFn: () =>
      fetchBookings({
        propertyId: selectedPropertyId!,
        startDate,
        endDate,
      }),
    enabled: Boolean(selectedPropertyId),
  });
}
