import { useQuery } from "@tanstack/react-query";

import { fetchTenantUsers } from "@/api/tenant-users";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useTenantUsers(enabled: boolean) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: ["users", "tenant", authKey],
    queryFn: fetchTenantUsers,
    enabled,
  });
}
