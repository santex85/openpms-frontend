import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchEmailSettings,
  postPropertyEmailTest,
  putEmailSettings,
} from "@/api/email-settings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { EmailSettingsPut, EmailSettingsRead } from "@/types/email-settings";

export function emailSettingsQueryKey(
  propertyId: string | null,
  authKey: string
): (string | null)[] {
  return ["email-settings", propertyId, authKey];
}

export function useEmailSettings(propertyId: string | null) {
  const authKey = authQueryKeyPart();
  return useQuery({
    queryKey: emailSettingsQueryKey(propertyId, authKey),
    queryFn: () => fetchEmailSettings(propertyId!),
    enabled: propertyId !== null && propertyId !== "",
  });
}

export function usePutEmailSettings() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (args: { propertyId: string; body: EmailSettingsPut }) =>
      putEmailSettings(args.propertyId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({
        queryKey: emailSettingsQueryKey(args.propertyId, authKey),
      });
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (propertyId: string) => postPropertyEmailTest(propertyId),
  });
}

export type { EmailSettingsPut, EmailSettingsRead };
