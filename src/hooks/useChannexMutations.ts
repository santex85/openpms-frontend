import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  activateChannex,
  connectChannex,
  disconnectChannex,
  mapChannexRates,
  mapChannexRooms,
  validateChannexKey,
} from "@/api/channex";
import type {
  ChannexConnectBody,
  ChannexProperty,
  ChannexValidateKeyBody,
  RateMappingBody,
  RoomMappingBody,
} from "@/types/channex";

export function useValidateChannexKey() {
  return useMutation({
    mutationFn: (body: ChannexValidateKeyBody) => validateChannexKey(body),
  });
}

export function useConnectChannex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      body,
      propertyId,
    }: {
      body: ChannexConnectBody;
      propertyId: string;
    }) => connectChannex(body, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channex"] });
    },
  });
}

export function useMapChannexRooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      body,
      propertyId,
    }: {
      body: RoomMappingBody;
      propertyId: string;
    }) => mapChannexRooms(body, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channex"] });
    },
  });
}

export function useMapChannexRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      body,
      propertyId,
    }: {
      body: RateMappingBody;
      propertyId: string;
    }) => mapChannexRates(body, propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channex"] });
    },
  });
}

export function useActivateChannex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: string) => activateChannex(propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channex"] });
    },
  });
}

export function useDisconnectChannex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: string) => disconnectChannex(propertyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channex"] });
    },
  });
}

/** Exported for typing validate mutation result in components. */
export type ChannexPropertyList = ChannexProperty[];
