import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bulkUpsertRates } from "@/api/nightly-rates";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import type { BulkRatesPutRequest } from "@/types/rates";

export function useBulkUpsertRates() {
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();

  return useMutation({
    mutationFn: (body: BulkRatesPutRequest) => bulkUpsertRates(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["rates", "nightly", authKey],
      });
    },
  });
}
