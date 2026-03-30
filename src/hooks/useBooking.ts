import { useQuery } from "@tanstack/react-query";

import { fetchBooking } from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useBooking(bookingId: string) {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["bookings", "detail", authKey, bookingId],
    queryFn: () => fetchBooking(bookingId),
    enabled: bookingId !== "",
  });
}
