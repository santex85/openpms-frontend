import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createRoom, createRoomsBulk, deleteRoom, patchRoom } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomBulkCreate, RoomCreate, RoomPatch } from "@/types/rooms";

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RoomCreate) => createRoom(body),
    onSuccess: async () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      const authKey = authQueryKeyPart();
      await queryClient.invalidateQueries({
        queryKey: ["rooms", authKey, propertyId],
      });
    },
  });
}

export function useCreateRoomsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RoomBulkCreate) => createRoomsBulk(body),
    onSuccess: async () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      const authKey = authQueryKeyPart();
      await queryClient.invalidateQueries({
        queryKey: ["rooms", authKey, propertyId],
      });
    },
  });
}

export function usePatchRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: string; body: RoomPatch }) =>
      patchRoom(roomId, body),
    onSuccess: async () => {
      const authKey = authQueryKeyPart();
      await queryClient.invalidateQueries({ queryKey: ["rooms", authKey] });
      toast.success("Номер обновлён.");
    },
    onError: () => {
      toast.error("Не удалось обновить номер.");
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: async () => {
      const authKey = authQueryKeyPart();
      await queryClient.invalidateQueries({ queryKey: ["rooms", authKey] });
      toast.success("Номер удалён.");
    },
    onError: () => {
      toast.error("Не удалось удалить номер.");
    },
  });
}
