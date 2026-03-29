import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRoom } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate } from "@/types/api";

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
