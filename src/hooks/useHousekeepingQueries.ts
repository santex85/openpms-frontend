import { useQueries } from "@tanstack/react-query";

import { fetchHousekeeping } from "@/api/housekeeping";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import {
  HOUSEKEEPING_COLUMN_STATUSES,
  type HousekeepingStatus,
} from "@/types/housekeeping";

/**
 * Четыре параллельных GET /housekeeping?property_id=&status= (&date= опционально).
 */
export function useHousekeepingQueries(dateIso: string | undefined) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const date =
    dateIso !== undefined && dateIso !== "" ? dateIso : undefined;

  const queries = useQueries({
    queries: HOUSEKEEPING_COLUMN_STATUSES.map((status) => ({
      queryKey: ["housekeeping", authKey, selectedPropertyId, status, date ?? ""],
      queryFn: () =>
        fetchHousekeeping({
          propertyId: selectedPropertyId!,
          status,
          ...(date !== undefined ? { date } : {}),
        }),
      enabled: Boolean(selectedPropertyId),
    })),
  });

  const byStatus = new Map<HousekeepingStatus, (typeof queries)[0]["data"]>();
  HOUSEKEEPING_COLUMN_STATUSES.forEach((status, i) => {
    byStatus.set(status, queries[i]?.data);
  });

  const isPending = queries.some((q) => q.isPending);
  const isError = queries.some((q) => q.isError);

  return {
    queries,
    byStatus,
    isPending,
    isError,
    propertyId: selectedPropertyId,
    authKey,
    date,
  };
}
