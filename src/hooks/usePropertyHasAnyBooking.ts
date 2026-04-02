import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchBookingsTape } from "@/api/bookings";
import { useCurrentUserQueryContext } from "@/hooks/useCurrentUserQueryContext";
import { useAuthRole } from "@/hooks/useAuthz";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import { formatIsoDateLocal } from "@/utils/boardDates";

/**
 * True if the property has at least one booking in a wide local-date window.
 * Housekeeping role may only query today on GET /bookings — we treat step 5 as satisfied for them
 * so onboarding does not stay stuck and we avoid 403 on a wide range.
 */
export function usePropertyHasAnyBooking(): boolean {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const { isPending: userPending } = useCurrentUserQueryContext();
  const role = useAuthRole();

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate()
    );
    const end = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    return {
      startDate: formatIsoDateLocal(start),
      endDate: formatIsoDateLocal(end),
    };
  }, []);

  const isHousekeeper = role === "housekeeper";

  const { data: hasAny } = useQuery({
    queryKey: [
      "bookings",
      authKey,
      selectedPropertyId,
      "onboarding-any",
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const propertyId = selectedPropertyId;
      if (propertyId === null) {
        return false;
      }
      const page = await fetchBookingsTape({
        propertyId,
        startDate,
        endDate,
        limit: 1,
        offset: 0,
      });
      return page.total > 0;
    },
    enabled:
      selectedPropertyId !== null &&
      !userPending &&
      !isHousekeeper,
    staleTime: 60_000,
  });

  if (isHousekeeper) {
    return true;
  }

  if (userPending) {
    return false;
  }

  return hasAny ?? false;
}
