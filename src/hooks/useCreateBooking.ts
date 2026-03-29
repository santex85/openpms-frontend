import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createBooking } from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { BookingCreateRequest } from "@/types/api";

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: BookingCreateRequest) => createBooking(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["bookings", authKey],
      });
    },
  });
}
