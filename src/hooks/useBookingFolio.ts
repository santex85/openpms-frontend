import { useQuery } from "@tanstack/react-query";

import { fetchBookingFolio } from "@/api/folio";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useBookingFolio(bookingId: string | undefined) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["bookings", "folio", authKey, bookingId],
    queryFn: () => fetchBookingFolio(bookingId!),
    enabled: Boolean(bookingId),
  });
}
