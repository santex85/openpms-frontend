import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchRoomType } from "@/api/room-types";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomTypePatch } from "@/types/api";

export function usePatchRoomType() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: ({
      roomTypeId,
      body,
    }: {
      roomTypeId: string;
      body: RoomTypePatch;
    }) => patchRoomType(roomTypeId, body),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["room-types", authKey, propertyId],
      });
      toast.success("Тип номера обновлён.");
    },
    onError: () => {
      toast.error("Не удалось сохранить тип номера.");
    },
  });
}
