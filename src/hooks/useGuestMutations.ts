import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { createGuest, deleteGuest, patchGuest } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { GuestCreate, GuestPatch } from "@/types/guests";

export function useCreateGuest() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: GuestCreate) => createGuest(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guests", authKey] });
      toast.success("Гость создан.");
    },
    onError: () => {
      toast.error("Не удалось создать гостя.");
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (guestId: string) => deleteGuest(guestId),
    onSuccess: (_data, guestId) => {
      const authKey = authQueryKeyPart();
      void queryClient.invalidateQueries({ queryKey: ["guests", authKey] });
      void queryClient.removeQueries({
        queryKey: ["guest", authKey, guestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", authKey],
        exact: false,
      });
      toast.success(t("guests.deleteSuccess"));
    },
  });
}

export function usePatchGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      guestId,
      body,
    }: {
      guestId: string;
      body: GuestPatch;
      bookingId?: string;
    }) => patchGuest(guestId, body),
    onSuccess: (_data, { guestId, bookingId }) => {
      const authKey = authQueryKeyPart();
      void queryClient.invalidateQueries({ queryKey: ["guests", authKey] });
      void queryClient.invalidateQueries({
        queryKey: ["guest", authKey, guestId],
      });
      if (bookingId !== undefined && bookingId !== "") {
        void queryClient.invalidateQueries({
          queryKey: ["bookings", "detail", authKey, bookingId],
        });
      }
      toast.success("Профиль гостя сохранён.");
    },
    onError: () => {
      toast.error("Не удалось сохранить изменения.");
    },
  });
}
