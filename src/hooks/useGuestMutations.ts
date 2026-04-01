import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createGuest, patchGuest } from "@/api/guests";
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

export function usePatchGuest() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: ({
      guestId,
      body,
    }: {
      guestId: string;
      body: GuestPatch;
    }) => patchGuest(guestId, body),
    onSuccess: (_data, { guestId }) => {
      void queryClient.invalidateQueries({ queryKey: ["guests", authKey] });
      void queryClient.invalidateQueries({
        queryKey: ["guest", authKey, guestId],
      });
      toast.success("Профиль гостя сохранён.");
    },
    onError: () => {
      toast.error("Не удалось сохранить изменения.");
    },
  });
}
