import { useQuery } from "@tanstack/react-query";

import { fetchRooms } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useRooms() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["rooms", authKey, selectedPropertyId],
    queryFn: () => fetchRooms(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId),
  });
}
