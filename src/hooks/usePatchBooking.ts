import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  type BookingPatchBody,
  patchBooking,
} from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function usePatchBooking(bookingId: string) {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: BookingPatchBody) =>
      patchBooking(bookingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", authKey, bookingId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", authKey],
        exact: false,
      });
    },
  });
}
