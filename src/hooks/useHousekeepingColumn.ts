import { useQuery } from "@tanstack/react-query";

import { fetchHousekeeping } from "@/api/housekeeping";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { HousekeepingStatus } from "@/types/housekeeping";

/** Один столбец (для Dashboard и т.п.). */
export function useHousekeepingColumn(
  status: HousekeepingStatus,
  dateIso: string | undefined
) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const datePart = dateIso !== undefined && dateIso !== "" ? dateIso : "";

  return useQuery({
    queryKey: ["housekeeping", authKey, selectedPropertyId, status, datePart],
    queryFn: () =>
      fetchHousekeeping({
        propertyId: selectedPropertyId!,
        status,
        ...(dateIso !== undefined && dateIso !== "" ? { date: dateIso } : {}),
      }),
    enabled: Boolean(selectedPropertyId),
  });
}
