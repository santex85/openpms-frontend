import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchBookingEmailLogs,
  postBookingSendInvoice,
} from "@/api/email-logs";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { EmailLogRead } from "@/types/email-log";

export function bookingEmailLogsQueryKey(
  bookingId: string,
  authKey: string
): (string | null)[] {
  return ["booking-email-logs", bookingId, authKey];
}

export function useBookingEmailLogs(bookingId: string) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: bookingEmailLogsQueryKey(bookingId, authKey),
    queryFn: () => fetchBookingEmailLogs(bookingId),
    enabled: bookingId !== "",
  });
}

export function useSendBookingInvoice() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (bookingId: string) => postBookingSendInvoice(bookingId),
    onSuccess: (_data, bookingId) => {
      void queryClient.invalidateQueries({
        queryKey: bookingEmailLogsQueryKey(bookingId, authKey),
      });
    },
  });
}

export type { EmailLogRead };
