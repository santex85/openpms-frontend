import { useEffect, useState } from "react";
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

const BOOKINGS_SEARCH_DEBOUNCE_MS = 300;

export interface UseBookingsListOptions {
  /** zero-based page index */
  page: number;
  pageSize: number;
  status?: string;
  /** Filter by guest name, email, booking id (sent as `q` when non-empty after debounce). */
  searchInput?: string;
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

  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    if (!isPaged) {
      return;
    }
    const raw = listOptions?.searchInput?.trim() ?? "";
    if (raw === "") {
      setDebouncedQ("");
      return;
    }
    const t = window.setTimeout(() => {
      setDebouncedQ(raw);
    }, BOOKINGS_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [isPaged, listOptions?.searchInput]);

  const pagedQuery = usePaginatedQuery(
    [
      "bookings",
      authKey,
      selectedPropertyId,
      startDate,
      endDate,
      listOptions?.status ?? null,
      debouncedQ,
    ],
    ({ limit, offset }) =>
      fetchBookingsTape({
        propertyId: selectedPropertyId!,
        startDate,
        endDate,
        limit,
        offset,
        status: listOptions?.status,
        ...(debouncedQ !== "" ? { q: debouncedQ } : {}),
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
