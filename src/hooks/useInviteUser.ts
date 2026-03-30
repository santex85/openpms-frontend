import { useMutation, useQueryClient } from "@tanstack/react-query";

import { inviteTenantUser } from "@/api/tenant-users";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { AuthInviteRequest } from "@/types/tenant-admin";

export function useInviteUser() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: AuthInviteRequest) => inviteTenantUser(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["users", "tenant", authKey],
      });
    },
  });
}
