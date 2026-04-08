import { useQuery } from "@tanstack/react-query";

import { fetchPropertyLockStatus } from "@/api/properties";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function usePropertyLockStatus(propertyId: string | null) {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["property-lock-status", authKey, propertyId],
    queryFn: () => fetchPropertyLockStatus(propertyId as string),
    enabled: propertyId !== null,
    staleTime: 60_000,
  });
}
