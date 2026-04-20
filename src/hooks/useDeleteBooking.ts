import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { deleteBooking } from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (bookingId: string) => deleteBooking(bookingId),
    onSuccess: (_data, bookingId) => {
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
      void queryClient.invalidateQueries({ queryKey: ["guests", authKey] });
      toast.success(t("bookings.deleteSuccess"));
    },
  });
}
