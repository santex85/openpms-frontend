import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchBookingsUnpaidFolio } from "@/api/bookings";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { BookingUnpaidFolioRow } from "@/types/api";

/**
 * Prefers `unpaid_folio` from GET /dashboard/summary (same query as useDashboardSummary, deduped).
 * Falls back to dedicated unpaid-folio URLs when the summary omits the field (older API).
 */
export function useBookingsUnpaidFolio(
  enabled: boolean
): UseQueryResult<BookingUnpaidFolioRow[]> {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const summaryQuery = useDashboardSummary();

  const embedded = summaryQuery.data?.unpaid_folio;
  const hasEmbedded = Array.isArray(embedded);
  const summaryReady =
    !summaryQuery.isPending &&
    (summaryQuery.isSuccess || summaryQuery.isError);

  const fallbackQuery = useQuery({
    queryKey: ["bookings", "unpaid-folio", authKey, selectedPropertyId],
    queryFn: () => fetchBookingsUnpaidFolio(selectedPropertyId!),
    enabled:
      enabled &&
      Boolean(selectedPropertyId) &&
      summaryReady &&
      !hasEmbedded,
    retry: false,
  });

  if (!enabled || !selectedPropertyId) {
    return fallbackQuery;
  }

  if (summaryQuery.isPending || summaryQuery.isLoading) {
    return { ...summaryQuery, data: undefined } as unknown as UseQueryResult<
      BookingUnpaidFolioRow[]
    >;
  }

  if (hasEmbedded) {
    return {
      ...summaryQuery,
      data: embedded,
      isPending: false,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      status: "success",
    } as unknown as UseQueryResult<BookingUnpaidFolioRow[]>;
  }

  return fallbackQuery;
}
