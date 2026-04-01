import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchRoom } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { RoomPatch } from "@/types/api";

export function usePatchRoom() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: string; body: RoomPatch }) =>
      patchRoom(roomId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms", authKey] });
      toast.success("Номер обновлён.");
    },
    onError: () => {
      toast.error("Не удалось обновить номер.");
    },
  });
}
