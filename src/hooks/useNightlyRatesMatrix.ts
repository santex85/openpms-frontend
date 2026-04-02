import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchRatesForRoomTypesBatch } from "@/api/nightly-rates";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RateRead } from "@/types/rates";

export interface NightlyRatesMatrixRow {
  roomTypeId: string;
  data: RateRead[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useNightlyRatesMatrix(
  roomTypeIds: string[],
  ratePlanId: string | null,
  startDate: string,
  endDate: string
) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const enabled =
    Boolean(selectedPropertyId) &&
    Boolean(ratePlanId) &&
    roomTypeIds.length > 0 &&
    startDate !== "" &&
    endDate !== "";

  const sortedIds = useMemo(() => [...roomTypeIds].sort(), [roomTypeIds]);

  const batchQuery = useQuery({
    queryKey: [
      "rates",
      "nightly",
      authKey,
      "batch",
      selectedPropertyId,
      sortedIds,
      ratePlanId,
      startDate,
      endDate,
    ] as const,
    queryFn: () =>
      fetchRatesForRoomTypesBatch({
        roomTypeIds: sortedIds,
        ratePlanId: ratePlanId!,
        startDate,
        endDate,
      }),
    enabled,
  });

  const rows: NightlyRatesMatrixRow[] = useMemo(
    () =>
      roomTypeIds.map((roomTypeId) => {
        const dataMap = batchQuery.data;
        const cell = dataMap?.get(roomTypeId);
        return {
          roomTypeId,
          data: cell,
          isPending: batchQuery.isPending,
          isError: batchQuery.isError,
          error:
            batchQuery.error instanceof Error
              ? batchQuery.error
              : batchQuery.error != null
                ? new Error(String(batchQuery.error))
                : null,
        };
      }),
    [roomTypeIds, batchQuery.data, batchQuery.isPending, batchQuery.isError, batchQuery.error]
  );

  return {
    rows,
    isAnyPending: batchQuery.isPending,
    isAnyError: batchQuery.isError,
    firstError:
      batchQuery.error instanceof Error
        ? batchQuery.error
        : batchQuery.error != null
          ? new Error(String(batchQuery.error))
          : null,
  };
}
