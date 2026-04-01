import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createGuest } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { GuestCreate } from "@/types/api";

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
