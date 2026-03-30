import { useQuery } from "@tanstack/react-query";

import { fetchApiKeys } from "@/api/api-keys";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useApiKeys(propertyId: string | null) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["api-keys", authKey, propertyId],
    queryFn: () => fetchApiKeys(propertyId!),
    enabled: Boolean(propertyId),
  });
}
