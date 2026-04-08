import { useQuery } from "@tanstack/react-query";

import {
  fetchChannexRates,
  fetchChannexRooms,
  fetchChannexStatus,
} from "@/api/channex";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useChannexStatus(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["channex", "status", authKey, selectedPropertyId],
    queryFn: () => fetchChannexStatus(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId) && enabled,
  });
}

export function useChannexRooms(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["channex", "rooms", authKey, selectedPropertyId],
    queryFn: () => fetchChannexRooms(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId) && enabled,
  });
}

export function useChannexRates(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["channex", "rates", authKey, selectedPropertyId],
    queryFn: () => fetchChannexRates(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId) && enabled,
  });
}
