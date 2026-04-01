import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  fetchBookingsAllInRange,
  fetchBookingsTape,
  type BookingTapePage,
} from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { usePropertyStore } from "@/stores/property-store";
import type { Booking } from "@/types/api";

export interface UseBookingsListOptions {
  /** zero-based page index */
  page: number;
  pageSize: number;
  status?: string;
}

export function useBookings(
  startDate: string,
  endDate: string
): UseQueryResult<Booking[]>;
export function useBookings(
  startDate: string,
  endDate: string,
  listOptions: UseBookingsListOptions
): UseQueryResult<BookingTapePage>;
export function useBookings(
  startDate: string,
  endDate: string,
  listOptions?: UseBookingsListOptions
): UseQueryResult<Booking[] | BookingTapePage> {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();
  const isPaged = listOptions !== undefined;

  const pagedQuery = usePaginatedQuery(
    [
      "bookings",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
      listOptions?.status ?? null,
    ],
    ({ limit, offset }) =>
      fetchBookingsTape({
        propertyId: selectedPropertyId!,
        startDate,
        endDate,
        limit,
        offset,
        status: listOptions?.status,
      }),
    listOptions?.page ?? 0,
    listOptions?.pageSize ?? 25,
    { enabled: isPaged && selectedPropertyId !== null }
  );

  const allQuery = useQuery({
    queryKey: [
      "bookings",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
      "all",
    ],
    queryFn: async () => {
      if (selectedPropertyId === null) {
        throw new Error("property not selected");
      }
      return fetchBookingsAllInRange({
        propertyId: selectedPropertyId,
        startDate,
        endDate,
      });
    },
    enabled: !isPaged && selectedPropertyId !== null,
  });

  if (isPaged) {
    return pagedQuery as UseQueryResult<Booking[] | BookingTapePage>;
  }
  return allQuery;
}
