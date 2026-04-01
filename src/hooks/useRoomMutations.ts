import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createRoom, deleteRoom, patchRoom } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate, RoomPatch } from "@/types/rooms";

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: RoomCreate) => createRoom(body),
    onSuccess: () => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      void queryClient.invalidateQueries({
        queryKey: ["rooms", authKey, propertyId],
      });
    },
  });
}

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
