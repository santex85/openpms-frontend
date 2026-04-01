import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchTenantUser } from "@/api/tenant-users";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { TenantUserPatchRequest } from "@/types/tenant-admin";

export function usePatchTenantUser() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: TenantUserPatchRequest;
    }) => patchTenantUser(userId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["users", "tenant", authKey],
      });
      toast.success("Пользователь обновлён.");
    },
  });
}
