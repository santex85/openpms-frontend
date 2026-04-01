import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  fetchBookingsAllInRange,
  fetchBookingsTape,
  type BookingTapePage,
} from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
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

  return useQuery({
    queryKey: isPaged
      ? [
          "bookings",
          authKey,
          selectedPropertyId,
          startDate,
          endDate,
          listOptions.page,
          listOptions.pageSize,
          listOptions.status ?? null,
        ]
      : [
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
      if (isPaged) {
        return fetchBookingsTape({
          propertyId: selectedPropertyId,
          startDate,
          endDate,
          limit: listOptions.pageSize,
          offset: listOptions.page * listOptions.pageSize,
          status: listOptions.status,
        });
      }
      return fetchBookingsAllInRange({
        propertyId: selectedPropertyId,
        startDate,
        endDate,
      });
    },
    enabled: selectedPropertyId !== null,
  });
}
