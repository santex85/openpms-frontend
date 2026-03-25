import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignBookingToRoom } from "@/api/bookings";

export function useAssignBookingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      roomId,
    }: {
      bookingId: string;
      roomId: string;
    }) => assignBookingToRoom(bookingId, roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      console.error("assignBookingToRoom failed", err);
    },
  });
}
