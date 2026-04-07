import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  bookingPatchTouchesStayDates,
  type BookingPatchBody,
  patchBooking,
} from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { toastInfo } from "@/lib/toast";

export function usePatchBooking(bookingId: string) {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (body: BookingPatchBody) =>
      patchBooking(bookingId, body),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", authKey, bookingId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "folio", authKey, bookingId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", authKey],
        exact: false,
      });
      if (bookingPatchTouchesStayDates(body)) {
        toastInfo(t("bookings.toastFolioAfterDateChange"));
      }
    },
  });
}
