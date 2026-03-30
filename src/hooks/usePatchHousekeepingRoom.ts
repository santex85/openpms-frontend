import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchHousekeepingRoom } from "@/api/housekeeping";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";
import {
  HOUSEKEEPING_COLUMN_STATUSES,
  type HousekeepingListResponse,
  type HousekeepingRoomCard,
  type HousekeepingStatus,
} from "@/types/housekeeping";

export interface PatchHousekeepingVariables {
  roomId: string;
  cardId: string;
  fromStatus: HousekeepingStatus;
  toStatus: HousekeepingStatus;
  dateIso: string;
  /** Карточка для переноса (копия из текущего столбца). */
  card: HousekeepingRoomCard;
}

function hkQueryKey(
  authKey: string,
  propertyId: string,
  status: HousekeepingStatus,
  datePart: string
) {
  return ["housekeeping", authKey, propertyId, status, datePart] as const;
}

export function usePatchHousekeepingRoom() {
  const queryClient = useQueryClient();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (variables: PatchHousekeepingVariables) =>
      patchHousekeepingRoom(variables.roomId, { status: variables.toStatus }),
    onMutate: async (variables) => {
      const pid = selectedPropertyId;
      if (pid === null) {
        return;
      }
      const datePart =
        variables.dateIso !== undefined && variables.dateIso !== ""
          ? variables.dateIso
          : "";
      await queryClient.cancelQueries({ queryKey: ["housekeeping", authKey, pid] });

      const prevSnapshots = new Map<
        string,
        HousekeepingListResponse | undefined
      >();
      for (const st of HOUSEKEEPING_COLUMN_STATUSES) {
        const key = hkQueryKey(authKey, pid, st, datePart);
        prevSnapshots.set(
          st,
          queryClient.getQueryData<HousekeepingListResponse>(key)
        );
      }

      const removeFrom = (
        data: HousekeepingListResponse | undefined,
        cardId: string
      ): HousekeepingListResponse | undefined => {
        if (data === undefined) return data;
        return {
          ...data,
          items: data.items.filter((i) => i.id !== cardId),
        };
      };

      const addTo = (
        data: HousekeepingListResponse | undefined,
        card: HousekeepingRoomCard,
        newStatus: HousekeepingStatus
      ): HousekeepingListResponse => {
        const base = data ?? { items: [] };
        const updatedCard: HousekeepingRoomCard = {
          ...card,
          status: newStatus,
        };
        return {
          ...base,
          items: [...base.items.filter((i) => i.id !== card.id), updatedCard],
        };
      };

      const fromKey = hkQueryKey(
        authKey,
        pid,
        variables.fromStatus,
        datePart
      );
      const toKey = hkQueryKey(authKey, pid, variables.toStatus, datePart);

      const fromData = queryClient.getQueryData<HousekeepingListResponse>(
        fromKey
      );
      queryClient.setQueryData<HousekeepingListResponse>(
        fromKey,
        removeFrom(fromData, variables.cardId) ?? { items: [] }
      );

      const toData = queryClient.getQueryData<HousekeepingListResponse>(toKey);
      queryClient.setQueryData<HousekeepingListResponse>(
        toKey,
        addTo(toData, variables.card, variables.toStatus)
      );

      return { prevSnapshots, pid, datePart };
    },
    onError: (_err, _variables, context) => {
      if (
        context === undefined ||
        context.prevSnapshots === undefined ||
        context.pid === undefined
      ) {
        return;
      }
      const { prevSnapshots, pid, datePart } = context;
      for (const st of HOUSEKEEPING_COLUMN_STATUSES) {
        const key = hkQueryKey(authKey, pid, st, datePart);
        const snap = prevSnapshots.get(st);
        queryClient.setQueryData(key, snap);
      }
    },
    onSettled: () => {
      const pid = selectedPropertyId;
      if (pid === null) return;
      void queryClient.invalidateQueries({
        queryKey: ["housekeeping", authKey, pid],
        exact: false,
      });
    },
  });
}
