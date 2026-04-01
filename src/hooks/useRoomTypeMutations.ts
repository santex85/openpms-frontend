import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createRoomType, deleteRoomType, patchRoomType } from "@/api/room-types";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomTypeCreate, RoomTypePatch } from "@/types/room-types";

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: RoomTypeCreate) => createRoomType(body),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["room-types", authKey, propertyId],
      });
    },
  });
}

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
