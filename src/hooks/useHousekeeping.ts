import { useQuery } from "@tanstack/react-query";

import { fetchHousekeeping } from "@/api/housekeeping";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useHousekeeping(dateIso: string) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["housekeeping", authKey, selectedPropertyId, dateIso],
    queryFn: () =>
      fetchHousekeeping({
        propertyId: selectedPropertyId!,
        date: dateIso,
      }),
    enabled: Boolean(selectedPropertyId) && dateIso !== "",
  });
}
