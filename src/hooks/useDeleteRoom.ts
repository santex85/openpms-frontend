import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deleteRoom } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms", authKey] });
      toast.success("Номер удалён.");
    },
    onError: () => {
      toast.error("Не удалось удалить номер.");
    },
  });
}
