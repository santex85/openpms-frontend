import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRoomType } from "@/api/room-types";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomTypeCreate } from "@/types/api";

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
