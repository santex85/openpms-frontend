import { useQuery } from "@tanstack/react-query";

import { fetchRoomTypes } from "@/api/room-types";
import { usePropertyStore } from "@/stores/property-store";

export function useRoomTypes() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  return useQuery({
    queryKey: ["room-types", selectedPropertyId],
    queryFn: () => fetchRoomTypes(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId),
  });
}
