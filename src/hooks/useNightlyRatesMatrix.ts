import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchRatesForPeriod } from "@/api/nightly-rates";
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

  const queryResults = useQueries({
    queries: roomTypeIds.map((roomTypeId) => ({
      queryKey: [
        "rates",
        "nightly",
        authKey,
        selectedPropertyId,
        roomTypeId,
        ratePlanId,
        startDate,
        endDate,
      ] as const,
      queryFn: () =>
        fetchRatesForPeriod({
          roomTypeId,
          ratePlanId: ratePlanId!,
          startDate,
          endDate,
        }),
      enabled,
    })),
  });

  const rows: NightlyRatesMatrixRow[] = useMemo(
    () =>
      roomTypeIds.map((roomTypeId, index) => {
        const q = queryResults[index];
        return {
          roomTypeId,
          data: q?.data,
          isPending: q?.isPending ?? true,
          isError: q?.isError ?? false,
          error:
            q?.error instanceof Error
              ? q.error
              : q?.error != null
                ? new Error(String(q.error))
                : null,
        };
      }),
    [roomTypeIds, queryResults]
  );

  const isAnyPending = queryResults.some((q) => q.isPending);
  const isAnyError = queryResults.some((q) => q.isError);
  const firstError = queryResults.find((q) => q.isError)?.error;

  return {
    rows,
    isAnyPending,
    isAnyError,
    firstError:
      firstError instanceof Error
        ? firstError
        : firstError != null
          ? new Error(String(firstError))
          : null,
  };
}
