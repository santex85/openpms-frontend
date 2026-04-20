import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createRoomType, deleteRoomType, patchRoomType } from "@/api/room-types";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomType, RoomTypeCreate, RoomTypePatch } from "@/types/room-types";

function roomTypesQueryKey(propertyId: string) {
  return ["room-types", authQueryKeyPart(), propertyId] as const;
}

export function useCreateRoomType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RoomTypeCreate) => createRoomType(body),
    onSuccess: async (created, variables) => {
      const propertyId = variables.property_id;
      const key = roomTypesQueryKey(propertyId);
      queryClient.setQueryData<RoomType[]>(key, (prev) => {
        if (!prev) {
          return [created];
        }
        if (prev.some((r) => r.id === created.id)) {
          return prev;
        }
        return [...prev, created];
      });
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function usePatchRoomType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roomTypeId,
      body,
    }: {
      roomTypeId: string;
      body: RoomTypePatch;
    }) => patchRoomType(roomTypeId, body),
    onSuccess: async (updated) => {
      const propertyId = updated.property_id;
      const key = roomTypesQueryKey(propertyId);
      queryClient.setQueryData<RoomType[]>(key, (prev) => {
        if (!prev) {
          return [updated];
        }
        return prev.map((r) => (r.id === updated.id ? updated : r));
      });
      await queryClient.invalidateQueries({ queryKey: key });
      toast.success("Тип номера обновлён.");
    },
    onError: () => {
      toast.error("Не удалось сохранить тип номера.");
    },
  });
}

export function useDeleteRoomType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomTypeId: string) => deleteRoomType(roomTypeId),
    onSuccess: async (_, roomTypeId) => {
      const propertyId = usePropertyStore.getState().selectedPropertyId;
      if (propertyId) {
        const key = roomTypesQueryKey(propertyId);
        queryClient.setQueryData<RoomType[]>(key, (prev) =>
          prev?.filter((r) => r.id !== roomTypeId) ?? []
        );
      }
      await queryClient.invalidateQueries({
        queryKey: ["room-types", authQueryKeyPart()],
      });
      toast.success("Тип номера удалён.");
    },
    onError: () => {
      toast.error("Не удалось удалить тип номера.");
    },
  });
}
