import { useQuery } from "@tanstack/react-query";

import { fetchWebhooks } from "@/api/webhooks-admin";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useWebhooks(propertyId: string | null) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["webhooks", authKey, propertyId],
    queryFn: () => fetchWebhooks(propertyId!),
    enabled: Boolean(propertyId),
  });
}
