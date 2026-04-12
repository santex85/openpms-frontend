import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { chargeBooking, fetchBookingStripeCharges, refundBooking } from "@/api/stripe";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { ChargeRequest, RefundRequest } from "@/types/stripe";

export function useBookingStripeCharges(
  bookingId: string | undefined,
  enabled: boolean
) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["stripe", "charges", authKey, bookingId],
    queryFn: () => fetchBookingStripeCharges(bookingId!),
    enabled: Boolean(bookingId) && enabled,
  });
}

export function useChargeBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      body,
    }: {
      bookingId: string;
      body: ChargeRequest;
    }) => chargeBooking(bookingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stripe"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "folio"] });
    },
  });
}

export function useRefundCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      body,
    }: {
      bookingId: string;
      body: RefundRequest;
    }) => refundBooking(bookingId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stripe"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "folio"] });
    },
  });
}
