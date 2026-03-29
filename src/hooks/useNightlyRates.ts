import { useQuery } from "@tanstack/react-query";

import { fetchRatesForPeriod } from "@/api/nightly-rates";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useNightlyRates(
  roomTypeId: string | null,
  ratePlanId: string | null,
  startDate: string,
  endDate: string
) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const enabled =
    Boolean(selectedPropertyId) &&
    Boolean(roomTypeId) &&
    Boolean(ratePlanId) &&
    startDate !== "" &&
    endDate !== "";

  return useQuery({
    queryKey: [
      "rates",
      "nightly",
      authKey,
      selectedPropertyId,
      roomTypeId,
      ratePlanId,
      startDate,
      endDate,
    ],
    queryFn: () =>
      fetchRatesForPeriod({
        roomTypeId: roomTypeId!,
        ratePlanId: ratePlanId!,
        startDate,
        endDate,
      }),
    enabled,
  });
}
