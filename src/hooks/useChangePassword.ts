import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  changePassword,
  type AuthChangePasswordRequest,
} from "@/api/auth";

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AuthChangePasswordRequest) => changePassword(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Пароль обновлён.");
    },
  });
}
