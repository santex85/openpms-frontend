import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deleteRoomType } from "@/api/room-types";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useDeleteRoomType() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (roomTypeId: string) => deleteRoomType(roomTypeId),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["room-types", authKey, propertyId],
      });
      toast.success("Тип номера удалён.");
    },
    onError: () => {
      toast.error("Не удалось удалить тип номера.");
    },
  });
}
